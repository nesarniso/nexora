<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Group;
use App\Models\GroupContentReport;
use App\Models\GroupPost;
use App\Models\SecurityEvent;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_visitors_are_redirected_from_the_admin_panel(): void
    {
        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_users_are_forbidden_from_the_admin_panel(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_non_admin_users_cannot_grant_admin_access(): void
    {
        $user = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('admin.users.role.update', $target), ['action' => 'grant'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'is_admin' => false,
        ]);
    }

    public function test_admin_dashboard_shows_platform_totals_and_recent_users(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create(['name' => 'Recent Nexora Member']);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('stats.users', 2)
                ->where('stats.posts', 0)
                ->where('stats.groups', 0)
                ->where('stats.openReports', 0)
                ->has('recentUsers', 2)
                ->where('recentUsers.0.name', 'Recent Nexora Member')
            );
    }

    public function test_admin_analytics_shows_platform_totals_and_recent_daily_activity(): void
    {
        $this->freezeTime();
        $admin = $this->createAdmin();
        $member = User::factory()->create();
        $member->posts()->create([
            'content' => 'An analytics test post',
            'visibility' => 'public',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.analytics.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Analytics')
                ->where('stats.users', 2)
                ->where('stats.posts', 1)
                ->has('dailyActivity', 14)
                ->where('dailyActivity.13.users', 2)
                ->where('dailyActivity.13.posts', 1)
            );
    }

    public function test_admin_can_search_the_user_directory_by_name_or_email(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create([
            'name' => 'Nexora Search Target',
            'email' => 'target@example.test',
        ])->profile()->update([
            'avatar_url' => 'https://images.example.test/target-avatar.jpg',
        ]);
        User::factory()->create([
            'name' => 'Unrelated Account',
            'email' => 'unrelated@example.test',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['search' => 'target@example.test']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.search', 'target@example.test')
                ->has('users.data', 1)
                ->where('users.data.0.name', 'Nexora Search Target')
                ->where('users.data.0.profile.avatar_url', 'https://images.example.test/target-avatar.jpg')
            );
    }

    public function test_admin_can_filter_security_events_by_email_or_event_type(): void
    {
        $admin = $this->createAdmin();
        SecurityEvent::query()->create([
            'event_type' => 'login_failed',
            'email' => 'target@example.test',
            'ip_address' => '192.0.2.10',
            'user_agent' => 'Test Browser',
        ]);
        SecurityEvent::query()->create([
            'event_type' => 'login_locked',
            'email' => 'other@example.test',
            'ip_address' => '192.0.2.11',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.security.index', [
                'event_type' => 'login_failed',
                'search' => 'target@example.test',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Security')
                ->where('filters.event_type', 'login_failed')
                ->where('filters.search', 'target@example.test')
                ->has('events.data', 1)
                ->where('events.data.0.email', 'target@example.test')
                ->where('events.data.0.user_agent', 'Test Browser')
            );
    }

    public function test_failed_and_rate_limited_login_attempts_are_recorded_without_passwords(): void
    {
        $email = 'security-review@example.test';

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.44'])
                ->withHeaders(['User-Agent' => 'Nexora security test browser'])
                ->post(route('login'), [
                    'email' => $email,
                    'password' => 'incorrect-secret',
                ]);

            $response->assertSessionHasErrors('email');
        }

        $this->assertDatabaseCount('security_events', 6);
        $this->assertDatabaseHas('security_events', [
            'event_type' => 'login_failed',
            'email' => $email,
            'ip_address' => '192.0.2.44',
            'user_agent' => 'Nexora security test browser',
        ]);
        $this->assertDatabaseHas('security_events', [
            'event_type' => 'login_locked',
            'email' => $email,
            'ip_address' => '192.0.2.44',
        ]);
    }

    public function test_admin_can_update_site_settings_and_registration_is_enforced(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.settings.index'))
            ->patch(route('admin.settings.update'), [
                'site_name' => 'Nexora Community',
                'tagline' => 'A safer place to connect.',
                'announcement' => 'Scheduled maintenance tonight.',
                'registration_enabled' => false,
            ])
            ->assertRedirect(route('admin.settings.index'));

        $this->assertDatabaseHas('site_settings', [
            'site_name' => 'Nexora Community',
            'tagline' => 'A safer place to connect.',
            'announcement' => 'Scheduled maintenance tonight.',
            'registration_enabled' => false,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'site.settings_updated',
            'target_type' => 'site_settings',
        ]);

        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('site.site_name', 'Nexora Community')
                ->where('site.registration_enabled', false)
            );

        Auth::logout();

        $this->get(route('register'))->assertNotFound();
        $this->post(route('register'), [])->assertNotFound();

        $this->actingAs($admin)
            ->get(route('admin.settings.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Settings')
                ->where('settings.site_name', 'Nexora Community')
                ->where('settings.registration_enabled', false)
            );
    }

    public function test_admin_settings_reject_an_overlong_site_name_without_saving(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.settings.index'))
            ->patch(route('admin.settings.update'), [
                'site_name' => str_repeat('N', 81),
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
            ])
            ->assertRedirect(route('admin.settings.index'))
            ->assertSessionHasErrors('site_name');

        $this->assertDatabaseHas('site_settings', [
            'site_name' => 'Nexora',
            'registration_enabled' => true,
        ]);
        $this->assertDatabaseMissing('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'site.settings_updated',
        ]);
    }

    public function test_admin_can_upload_site_logo_and_square_site_icon(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.settings.index'))
            ->post(route('admin.settings.update'), [
                '_method' => 'patch',
                'site_name' => 'Nexora',
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
                'logo' => UploadedFile::fake()->image('brand-logo.png', 600, 180),
                'site_icon' => UploadedFile::fake()->image('brand-icon.png', 64, 64),
            ])
            ->assertRedirect(route('admin.settings.index'));

        $settings = SiteSetting::query()->firstOrFail();
        $this->assertNotNull($settings->logo_path);
        $this->assertNotNull($settings->site_icon_path);
        Storage::disk('public')->assertExists($settings->logo_path);
        Storage::disk('public')->assertExists($settings->site_icon_path);

        $this->actingAs($admin)
            ->get(route('admin.settings.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Settings')
                ->where('settings.logo_url', Storage::disk('public')->url($settings->logo_path))
                ->where('settings.site_icon_url', Storage::disk('public')->url($settings->site_icon_path))
            );
    }

    public function test_replacing_site_branding_deletes_the_previous_images(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();
        $settings = SiteSetting::query()->firstOrFail();
        $oldLogoPath = 'site/branding/old-logo.png';
        $oldIconPath = 'site/branding/old-icon.png';
        Storage::disk('public')->put($oldLogoPath, 'old logo');
        Storage::disk('public')->put($oldIconPath, 'old icon');
        $settings->update([
            'logo_path' => $oldLogoPath,
            'site_icon_path' => $oldIconPath,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.settings.update'), [
                'site_name' => 'Nexora',
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
                'logo' => UploadedFile::fake()->image('replacement-logo.png', 600, 180),
                'site_icon' => UploadedFile::fake()->image('replacement-icon.png', 64, 64),
            ])
            ->assertRedirect();

        $settings->refresh();
        Storage::disk('public')->assertMissing($oldLogoPath);
        Storage::disk('public')->assertMissing($oldIconPath);
        Storage::disk('public')->assertExists($settings->logo_path);
        Storage::disk('public')->assertExists($settings->site_icon_path);
    }

    public function test_admin_rejects_a_non_square_site_icon_without_changing_branding(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();
        $settings = SiteSetting::query()->firstOrFail();
        $settings->update(['site_icon_path' => 'site/branding/existing-icon.png']);
        Storage::disk('public')->put('site/branding/existing-icon.png', 'existing icon');

        $this->actingAs($admin)
            ->from(route('admin.settings.index'))
            ->patch(route('admin.settings.update'), [
                'site_name' => 'Nexora',
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
                'site_icon' => UploadedFile::fake()->image('not-square.png', 64, 32),
            ])
            ->assertRedirect(route('admin.settings.index'))
            ->assertSessionHasErrors('site_icon');

        $this->assertSame('site/branding/existing-icon.png', $settings->fresh()->site_icon_path);
        Storage::disk('public')->assertExists('site/branding/existing-icon.png');
        $this->assertDatabaseMissing('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'site.settings_updated',
        ]);
    }

    public function test_admin_rejects_an_svg_site_logo(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.settings.index'))
            ->patch(route('admin.settings.update'), [
                'site_name' => 'Nexora',
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
                'logo' => UploadedFile::fake()->create('brand.svg', 1, 'image/svg+xml'),
            ])
            ->assertRedirect(route('admin.settings.index'))
            ->assertSessionHasErrors('logo');

        $this->assertNull(SiteSetting::query()->firstOrFail()->logo_path);
        Storage::disk('public')->assertDirectoryEmpty('site/branding');
        $this->assertDatabaseMissing('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'site.settings_updated',
        ]);
    }

    public function test_admin_can_remove_uploaded_site_branding(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();
        $settings = SiteSetting::query()->firstOrFail();
        $logoPath = 'site/branding/logo.png';
        $iconPath = 'site/branding/icon.png';
        Storage::disk('public')->put($logoPath, 'logo');
        Storage::disk('public')->put($iconPath, 'icon');
        $settings->update(['logo_path' => $logoPath, 'site_icon_path' => $iconPath]);

        $this->actingAs($admin)
            ->patch(route('admin.settings.update'), [
                'site_name' => 'Nexora',
                'tagline' => 'A tagline.',
                'announcement' => '',
                'registration_enabled' => true,
                'remove_logo' => true,
                'remove_site_icon' => true,
            ])
            ->assertRedirect();

        $this->assertNull($settings->fresh()->logo_path);
        $this->assertNull($settings->fresh()->site_icon_path);
        Storage::disk('public')->assertMissing($logoPath);
        Storage::disk('public')->assertMissing($iconPath);
    }

    public function test_disabling_registration_does_not_disable_existing_user_login(): void
    {
        SiteSetting::query()->firstOrFail()->update(['registration_enabled' => false]);
        $user = User::factory()->create();

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
    }

    public function test_admin_audit_export_is_a_csv_and_neutralizes_spreadsheet_formulas(): void
    {
        $admin = $this->createAdmin();
        AdminAuditLog::query()->create([
            'actor_id' => $admin->id,
            'action' => 'site.settings_updated',
            'target_type' => 'site_settings',
            'target_label' => ' =HYPERLINK("https://example.test")',
            'metadata' => ['site_name' => '+DANGEROUS()'],
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.activity.export'))
            ->assertDownload()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $contents = $response->streamedContent();

        $this->assertStringContainsString("' =HYPERLINK", $contents);
        $this->assertStringNotContainsString("\n =HYPERLINK", $contents);
        $this->assertStringContainsString('Administrator email', $contents);
    }

    public function test_admin_management_pages_are_forbidden_to_regular_users(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.analytics.index'))->assertForbidden();
        $this->get(route('admin.security.index'))->assertForbidden();
        $this->get(route('admin.settings.index'))->assertForbidden();
        $this->get(route('admin.activity.export'))->assertForbidden();
    }

    public function test_admin_can_revoke_admin_access_for_other_users(): void
    {
        $admin = $this->createAdmin();
        $secondAdmin = $this->createAdmin();

        $this->actingAs($admin)
            ->patch(route('admin.users.role.update', $secondAdmin), ['action' => 'revoke'])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $secondAdmin->id,
            'is_admin' => false,
        ]);
    }

    public function test_admin_cannot_grant_admin_access_from_the_user_directory(): void
    {
        $admin = $this->createAdmin();
        $member = User::factory()->create();

        $this->actingAs($admin)
            ->from(route('admin.users.index'))
            ->patch(route('admin.users.role.update', $member), ['action' => 'grant'])
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasErrors('action');

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'is_admin' => false,
        ]);
    }

    public function test_admin_can_suspend_and_restore_user_accounts(): void
    {
        $admin = $this->createAdmin();
        $member = User::factory()->create();

        $this->actingAs($admin)
            ->patch(route('admin.users.status.update', $member), ['action' => 'suspend'])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'is_suspended' => true,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'user.account_suspended',
            'target_id' => $member->id,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.users.status.update', $member), ['action' => 'restore'])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'is_suspended' => false,
        ]);
    }

    public function test_suspended_accounts_cannot_login(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['is_suspended' => true])->save();

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect('/')
            ->assertSessionHasErrors('email');
    }

    public function test_suspended_active_sessions_are_logged_out_on_the_next_site_request(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->forceFill(['is_suspended' => true])->save();

        $this->get(route('dashboard'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');
    }

    public function test_admin_can_remove_any_personal_feed_post_and_record_the_action(): void
    {
        $admin = $this->createAdmin();
        $author = User::factory()->create();
        $post = $author->posts()->create([
            'content' => 'Post requiring moderation',
            'visibility' => 'public',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.content.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Content')
                ->where('filters.type', 'personal')
                ->where('filters.per_page', 25)
                ->where('posts.data.0.content', 'Post requiring moderation')
            );

        $this->actingAs($admin)
            ->delete(route('admin.content.posts.destroy', $post))
            ->assertRedirect();

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'content.post_deleted',
            'target_id' => $post->id,
        ]);
    }

    public function test_admin_content_queue_filters_group_posts_by_media_and_date(): void
    {
        $admin = $this->createAdmin();
        $owner = User::factory()->create();
        $author = User::factory()->create(['name' => 'Content Queue Author']);
        $group = Group::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Queue Search Community',
            'privacy' => 'public',
        ]);

        $groupPost = GroupPost::query()->create([
            'group_id' => $group->id,
            'user_id' => $author->id,
            'content' => 'A matching group moderation record',
            'image_path' => 'group-posts/queue-image.jpg',
        ]);
        DB::table('group_posts')->where('id', $groupPost->id)->update(['created_at' => '2026-10-03 12:00:00', 'updated_at' => '2026-10-03 12:00:00']);

        GroupPost::query()->create([
            'group_id' => $group->id,
            'user_id' => $author->id,
            'content' => 'Text only group moderation record',
        ]);
        DB::table('group_posts')->whereNotIn('id', [$groupPost->id])->where('group_id', $group->id)->update(['created_at' => '2026-10-02 12:00:00', 'updated_at' => '2026-10-02 12:00:00']);

        $this->actingAs($admin)
            ->get(route('admin.content.index', [
                'type' => 'group',
                'media' => 'with_media',
                'search' => 'Queue Search Community',
                'from' => '2026-10-03',
                'to' => '2026-10-03',
                'per_page' => 50,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Content')
                ->where('filters.type', 'group')
                ->where('filters.media', 'with_media')
                ->where('filters.per_page', 50)
                ->where('filters.from', '2026-10-03')
                ->where('filters.to', '2026-10-03')
                ->has('posts.data', 1)
                ->where('posts.data.0.id', $groupPost->id)
                ->where('posts.data.0.user.name', 'Content Queue Author')
                ->where('posts.data.0.group.name', 'Queue Search Community')
            );
    }

    public function test_admin_content_queue_uses_cursor_pagination_for_large_post_lists(): void
    {
        $admin = $this->createAdmin();
        $author = User::factory()->create();

        foreach (range(1, 26) as $postNumber) {
            $author->posts()->create([
                'content' => "Moderation queue post {$postNumber}",
                'visibility' => 'public',
                'created_at' => now()->addSeconds($postNumber),
            ]);
        }

        $this->actingAs($admin)
            ->get(route('admin.content.index', ['per_page' => 25]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Content')
                ->has('posts.data', 25)
                ->where('posts.per_page', 25)
                ->has('posts.next_page_url')
            );
    }

    public function test_admin_content_queue_rejects_unsupported_page_sizes(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.content.index'))
            ->get(route('admin.content.index', ['per_page' => 1000]))
            ->assertRedirect(route('admin.content.index'))
            ->assertSessionHasErrors('per_page');
    }

    public function test_admin_content_queue_rejects_an_end_date_before_the_start_date(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->from(route('admin.content.index'))
            ->get(route('admin.content.index', [
                'from' => '2026-10-04',
                'to' => '2026-10-03',
            ]))
            ->assertRedirect(route('admin.content.index'))
            ->assertSessionHasErrors('to');
    }

    public function test_admin_can_manage_groups_and_delete_a_group(): void
    {
        $admin = $this->createAdmin();
        $owner = User::factory()->create();
        $group = Group::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Admin-managed community',
            'privacy' => 'public',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.groups.index', ['search' => 'Admin-managed']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Groups')
                ->has('groups.data', 1)
                ->where('groups.data.0.name', 'Admin-managed community')
            );

        $this->actingAs($admin)
            ->delete(route('admin.groups.destroy', $group))
            ->assertRedirect();

        $this->assertDatabaseMissing('groups', ['id' => $group->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'group.deleted',
            'target_id' => $group->id,
        ]);
    }

    public function test_admin_can_update_group_details_and_privacy(): void
    {
        $admin = $this->createAdmin();
        $owner = User::factory()->create();
        $group = Group::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Old group name',
            'description' => 'Old description',
            'privacy' => 'public',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.groups.update', $group), [
                'name' => 'Updated community',
                'description' => 'Updated by the site administrator.',
                'privacy' => 'private',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('groups', [
            'id' => $group->id,
            'name' => 'Updated community',
            'description' => 'Updated by the site administrator.',
            'privacy' => 'private',
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'group.updated',
            'target_id' => $group->id,
        ]);
    }

    public function test_admin_can_review_reports_from_any_group(): void
    {
        Storage::fake('public');
        $admin = $this->createAdmin();
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $group = Group::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Global report queue',
            'privacy' => 'private',
        ]);
        $post = GroupPost::query()->create([
            'group_id' => $group->id,
            'user_id' => $author->id,
            'content' => 'Reported group content',
        ]);
        $report = GroupContentReport::query()->create([
            'group_id' => $group->id,
            'reporter_id' => $reporter->id,
            'group_post_id' => $post->id,
            'target_type' => 'post',
            'reason' => 'spam',
            'status' => 'open',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.reports.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Reports')
                ->has('reports.data', 1)
                ->where('reports.data.0.post.content', 'Reported group content')
            );

        $this->actingAs($admin)
            ->patch(route('admin.reports.review', $report), ['action' => 'remove_content'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_content_reports', [
            'id' => $report->id,
            'status' => 'resolved',
            'reviewed_by_id' => $admin->id,
        ]);
        $this->assertDatabaseMissing('group_posts', ['id' => $post->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'report.content_removed',
            'target_id' => $report->id,
        ]);
    }

    public function test_admin_cannot_change_its_own_role(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->patch(route('admin.users.role.update', $admin), ['action' => 'revoke'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'is_admin' => true,
        ]);
    }

    public function test_console_command_cannot_revoke_the_last_administrator(): void
    {
        $admin = $this->createAdmin();

        $exitCode = Artisan::call('admin:role', [
            'email' => $admin->email,
            'action' => 'revoke',
        ]);

        $this->assertSame(1, $exitCode);
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'is_admin' => true,
        ]);
    }

    public function test_console_command_can_bootstrap_the_first_administrator(): void
    {
        $user = User::factory()->create();

        $exitCode = Artisan::call('admin:role', ['email' => $user->email]);

        $this->assertSame(0, $exitCode);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_admin' => true,
        ]);

        $user->refresh();

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('stats.users', 1)
            );
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }
}
