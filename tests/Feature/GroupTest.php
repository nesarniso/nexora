<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPost;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_a_private_group_as_its_admin(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('groups.store'), [
                'name' => 'Neighborhood Gardeners',
                'description' => 'Share local gardening tips.',
                'privacy' => 'private',
            ])
            ->assertRedirect();

        $group = Group::query()->where('name', 'Neighborhood Gardeners')->firstOrFail();
        $this->assertSame('private', $group->privacy);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'approved',
        ]);
    }

    public function test_group_creation_rejects_invalid_privacy(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('groups.index'))
            ->post(route('groups.store'), [
                'name' => 'Invalid group',
                'privacy' => 'secret',
            ])
            ->assertRedirect(route('groups.index'))
            ->assertSessionHasErrors('privacy');

        $this->assertDatabaseCount('groups', 0);
    }

    public function test_discovery_lists_public_groups_but_hides_private_groups_from_non_members(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $publicGroup = $this->createGroup($owner, 'Open book club', 'public');
        $privateGroup = $this->createGroup($owner, 'Private book club', 'private');

        $this->actingAs($viewer)
            ->get(route('groups.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Groups/Index')
                ->has('groups.data', 1)
                ->where('groups.data.0.id', $publicGroup->id)
            );

        $this->actingAs($viewer)
            ->get(route('groups.index', ['search' => 'book']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('groups.data', 1)
                ->where('groups.data.0.id', $publicGroup->id)
            );

        $privateGroup->memberships()->create([
            'user_id' => $viewer->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        $this->actingAs($viewer)
            ->get(route('groups.index', ['tab' => 'your-groups']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('groups.data', 1)
                ->where('groups.data.0.id', $privateGroup->id)
            );

        $this->actingAs($viewer)
            ->get(route('groups.show', $privateGroup))
            ->assertNotFound();
    }

    public function test_group_discovery_shows_admins_their_managed_groups_and_pending_request_counts(): void
    {
        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $group = $this->createGroup($owner, 'Admin gardening club', 'private');
        $group->memberships()->create([
            'user_id' => $applicant->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        $this->actingAs($owner)
            ->get(route('groups.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('managedGroups', 1)
                ->where('managedGroups.0.id', $group->id)
                ->where('managedGroups.0.pending_members_count', 1)
            );
    }

    public function test_private_group_join_request_stays_hidden_until_an_admin_approves_it(): void
    {
        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $group = $this->createGroup($owner, 'Private readers', 'private');
        $privatePost = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Members only discussion',
        ]);

        $this->actingAs($applicant)
            ->post(route('groups.join', $group))
            ->assertRedirect();

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'group_join_request',
        ]);

        $this->actingAs($applicant)
            ->get(route('groups.show', $group))
            ->assertNotFound();

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->has('pendingMembers', 1)
                ->where('pendingMembers.0.user_id', $applicant->id)
            );

        $membership = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $applicant->id)
            ->firstOrFail();

        $this->actingAs($owner)
            ->patch(route('groups.members.moderate', [$group, $membership]), ['action' => 'approve'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'status' => 'approved',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $applicant->id,
            'type' => 'group_join_approved',
        ]);

        $this->actingAs($applicant)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Groups/Show')
                ->where('isMember', true)
                ->where('posts.data.0.content', $privatePost->content)
            );
    }

    public function test_private_group_admin_can_reject_a_pending_membership(): void
    {
        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $group = $this->createGroup($owner, 'Private chess', 'private');
        $membership = $group->memberships()->create([
            'user_id' => $applicant->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        $this->actingAs($owner)
            ->patch(route('groups.members.moderate', [$group, $membership]), ['action' => 'reject'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'status' => 'rejected',
        ]);
        $this->actingAs($applicant)->get(route('groups.show', $group))->assertNotFound();
    }

    public function test_public_group_posts_are_visible_to_readers_but_only_members_can_post(): void
    {
        $owner = User::factory()->create();
        $reader = User::factory()->create();
        $group = $this->createGroup($owner, 'Public runners', 'public');

        $this->actingAs($reader)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Groups/Show')
                ->where('isMember', false)
            );

        $this->actingAs($reader)
            ->post(route('groups.posts.store', $group), ['content' => 'I should not post yet'])
            ->assertForbidden();
        $this->assertDatabaseCount('group_posts', 0);

        $this->actingAs($reader)->post(route('groups.join', $group))->assertRedirect();
        $this->actingAs($reader)
            ->post(route('groups.posts.store', $group), ['content' => 'Hello, runners!'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_posts', [
            'group_id' => $group->id,
            'user_id' => $reader->id,
            'content' => 'Hello, runners!',
        ]);

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('posts.data.0.content', 'Hello, runners!')
            );
        $this->actingAs($reader)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('posts.data.0.content', 'Hello, runners!')
            );
    }

    public function test_group_member_can_create_a_post_with_an_image_and_see_it_in_the_feed(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Community photographers', 'private');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        $image = UploadedFile::fake()->image('community.jpg');

        $this->actingAs($member)
            ->post(route('groups.posts.store', $group), [
                'content' => '',
                'image' => $image,
            ])
            ->assertRedirect();

        $post = GroupPost::query()->where('group_id', $group->id)->firstOrFail();
        $this->assertSame('', $post->content);
        $this->assertNotNull($post->image_path);
        Storage::disk('public')->assertExists($post->image_path);

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('posts.data.0.content', '')
                ->where('posts.data.0.image_url', Storage::disk('public')->url($post->image_path))
            );
    }

    public function test_group_post_rejects_non_image_uploads(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $group = $this->createGroup($owner, 'Community illustrators', 'public');

        $this->actingAs($owner)
            ->from(route('groups.show', $group))
            ->post(route('groups.posts.store', $group), [
                'content' => '',
                'image' => UploadedFile::fake()->create('document.pdf', 20, 'application/pdf'),
            ])
            ->assertRedirect(route('groups.show', $group))
            ->assertSessionHasErrors('image');

        $this->assertDatabaseCount('group_posts', 0);
        Storage::disk('public')->assertDirectoryEmpty('group-posts/'.$group->id);
    }

    public function test_group_member_can_comment_on_a_post_and_notifies_its_author(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Private book club', 'private');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        $post = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'What are you reading?',
        ]);

        $this->actingAs($member)
            ->post(route('groups.posts.comments.store', [$group, $post]), [
                'body' => 'A great mystery novel.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('group_post_comments', [
            'group_post_id' => $post->id,
            'user_id' => $member->id,
            'body' => 'A great mystery novel.',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'group_post_comment',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $member->id,
            'type' => 'group_post_comment',
        ]);

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('posts.data.0.comments_count', 1)
                ->where('posts.data.0.comments.0.body', 'A great mystery novel.')
            );
    }

    public function test_group_post_reaction_can_be_changed_and_toggled_off(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Public film club', 'public');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        $post = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Favorite films?',
        ]);

        $this->actingAs($member)
            ->post(route('groups.posts.reactions.store', [$group, $post]), ['type' => 'love'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_post_reactions', [
            'group_post_id' => $post->id,
            'user_id' => $member->id,
            'type' => 'love',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'group_post_reaction',
        ]);

        $this->actingAs($member)
            ->post(route('groups.posts.reactions.store', [$group, $post]), ['type' => 'support'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_post_reactions', [
            'group_post_id' => $post->id,
            'user_id' => $member->id,
            'type' => 'support',
        ]);
        $this->assertDatabaseCount('notifications', 1);

        $this->actingAs($member)
            ->post(route('groups.posts.reactions.store', [$group, $post]), ['type' => 'support'])
            ->assertRedirect();

        $this->assertDatabaseMissing('group_post_reactions', [
            'group_post_id' => $post->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_post_author_can_edit_and_delete_their_group_post_and_its_unshared_image(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $group = $this->createGroup($owner, 'Local photographers', 'public');
        $imagePath = UploadedFile::fake()->image('sunset.jpg')->store('group-posts/'.$group->id, 'public');
        $post = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Before edit',
            'image_path' => $imagePath,
        ]);

        $this->actingAs($owner)
            ->patch(route('groups.posts.update', [$group, $post]), ['content' => 'After edit'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_posts', [
            'id' => $post->id,
            'content' => 'After edit',
            'image_path' => $imagePath,
        ]);

        $this->actingAs($owner)
            ->delete(route('groups.posts.destroy', [$group, $post]))
            ->assertRedirect();

        $this->assertDatabaseMissing('group_posts', ['id' => $post->id]);
        Storage::disk('public')->assertMissing($imagePath);
    }

    public function test_only_the_post_author_or_group_admin_can_delete_a_group_post(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Community readers', 'public');
        $group->memberships()->createMany([
            ['user_id' => $author->id, 'role' => 'member', 'status' => 'approved'],
            ['user_id' => $member->id, 'role' => 'member', 'status' => 'approved'],
        ]);
        $post = $group->posts()->create([
            'user_id' => $author->id,
            'content' => 'A member post',
        ]);

        $this->actingAs($member)
            ->delete(route('groups.posts.destroy', [$group, $post]))
            ->assertForbidden();

        $this->assertModelExists($post);

        $this->actingAs($owner)
            ->delete(route('groups.posts.destroy', [$group, $post]))
            ->assertRedirect();

        $this->assertModelMissing($post);
    }

    public function test_non_members_cannot_comment_or_react_to_group_posts(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $group = $this->createGroup($owner, 'Private history club', 'private');
        $post = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Members only',
        ]);

        $this->actingAs($outsider)
            ->post(route('groups.posts.comments.store', [$group, $post]), ['body' => 'I should not see this'])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->post(route('groups.posts.reactions.store', [$group, $post]), ['type' => 'like'])
            ->assertForbidden();

        $this->assertDatabaseCount('group_post_comments', 0);
        $this->assertDatabaseCount('group_post_reactions', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_group_member_cannot_comment_on_a_post_from_another_group(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'First club', 'public');
        $otherGroup = $this->createGroup($owner, 'Second club', 'public');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        $post = $otherGroup->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Another group post',
        ]);

        $this->actingAs($member)
            ->post(route('groups.posts.comments.store', [$group, $post]), ['body' => 'Cross-group comment'])
            ->assertNotFound();

        $this->assertDatabaseCount('group_post_comments', 0);
    }

    public function test_group_member_can_report_a_post_and_admin_sees_it_in_the_moderation_queue(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $group = $this->createGroup($owner, 'Community gardeners', 'private');
        $group->memberships()->createMany([
            ['user_id' => $author->id, 'role' => 'member', 'status' => 'approved'],
            ['user_id' => $reporter->id, 'role' => 'member', 'status' => 'approved'],
        ]);
        $post = $group->posts()->create([
            'user_id' => $author->id,
            'content' => 'A post that needs review.',
        ]);

        $this->actingAs($reporter)
            ->post(route('groups.posts.reports.store', [$group, $post]), [
                'reason' => 'spam',
                'details' => 'This looks like repeated advertising.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('group_content_reports', [
            'group_id' => $group->id,
            'reporter_id' => $reporter->id,
            'group_post_id' => $post->id,
            'target_type' => 'post',
            'reason' => 'spam',
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'group_content_reported',
        ]);

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('openReports.0.target_content', 'A post that needs review.')
                ->where('openReports.0.reporter_name', $reporter->name)
            );

        $this->actingAs($reporter)
            ->from(route('groups.show', $group))
            ->post(route('groups.posts.reports.store', [$group, $post]), [
                'reason' => 'spam',
            ])
            ->assertRedirect(route('groups.show', $group))
            ->assertSessionHasErrors('reason');

        $this->assertDatabaseCount('group_content_reports', 1);
    }

    public function test_group_admin_can_dismiss_a_post_report_and_remove_reported_comments(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $group = $this->createGroup($owner, 'Local artists', 'public');
        $group->memberships()->createMany([
            ['user_id' => $author->id, 'role' => 'member', 'status' => 'approved'],
            ['user_id' => $reporter->id, 'role' => 'member', 'status' => 'approved'],
        ]);
        $post = $group->posts()->create([
            'user_id' => $author->id,
            'content' => 'A community post.',
        ]);
        $comment = $post->comments()->create([
            'user_id' => $author->id,
            'body' => 'A comment requiring review.',
        ]);

        $this->actingAs($reporter)
            ->post(route('groups.posts.reports.store', [$group, $post]), ['reason' => 'other'])
            ->assertRedirect();
        $postReport = $group->contentReports()->where('target_type', 'post')->firstOrFail();

        $this->actingAs($reporter)
            ->post(route('groups.posts.comments.reports.store', [$group, $post, $comment]), [
                'reason' => 'harassment',
                'details' => 'Please review this comment.',
            ])
            ->assertRedirect();
        $commentReport = $group->contentReports()->where('target_type', 'comment')->firstOrFail();

        $this->actingAs($owner)
            ->patch(route('groups.reports.review', [$group, $postReport]), ['action' => 'dismiss'])
            ->assertRedirect();

        $this->assertDatabaseHas('group_content_reports', [
            'id' => $postReport->id,
            'status' => 'dismissed',
            'reviewed_by_id' => $owner->id,
        ]);
        $this->assertModelExists($post);

        $this->actingAs($owner)
            ->patch(route('groups.reports.review', [$group, $commentReport]), ['action' => 'remove_content'])
            ->assertRedirect();

        $this->assertModelMissing($comment);
        $this->assertDatabaseHas('group_content_reports', [
            'id' => $commentReport->id,
            'status' => 'resolved',
            'group_post_comment_id' => null,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $reporter->id,
            'type' => 'group_report_resolved',
        ]);

        $unreportedComment = $post->comments()->create([
            'user_id' => $author->id,
            'body' => 'A comment for the admin-only removal control.',
        ]);

        $this->actingAs($author)
            ->delete(route('groups.posts.comments.destroy', [$group, $post, $unreportedComment]))
            ->assertForbidden();

        $this->actingAs($owner)
            ->delete(route('groups.posts.comments.destroy', [$group, $post, $unreportedComment]))
            ->assertRedirect();

        $this->assertModelMissing($unreportedComment);
    }

    public function test_group_admin_can_promote_demote_suspend_restore_and_remove_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Local cyclists', 'public');
        $membership = $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'promote'])
            ->assertRedirect();
        $this->assertDatabaseHas('group_memberships', ['id' => $membership->id, 'role' => 'admin']);

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'demote'])
            ->assertRedirect();

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'suspend'])
            ->assertRedirect();
        $this->assertDatabaseHas('group_memberships', ['id' => $membership->id, 'status' => 'suspended']);

        $this->actingAs($member)
            ->from(route('groups.show', $group))
            ->post(route('groups.join', $group))
            ->assertRedirect(route('groups.show', $group))
            ->assertSessionHasErrors('membership');
        $this->assertDatabaseHas('group_memberships', ['id' => $membership->id, 'status' => 'suspended']);

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'restore'])
            ->assertRedirect();
        $this->assertDatabaseHas('group_memberships', ['id' => $membership->id, 'status' => 'approved']);

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'remove'])
            ->assertRedirect();
        $this->assertDatabaseHas('group_memberships', ['id' => $membership->id, 'status' => 'left']);
        $this->assertDatabaseCount('notifications', 5);
    }

    public function test_non_admin_cannot_review_group_reports_or_manage_admin_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Private painters', 'private');
        $membership = $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        $post = $group->posts()->create([
            'user_id' => $owner->id,
            'content' => 'Post available for a member report.',
        ]);

        $this->actingAs($member)
            ->patch(route('groups.members.management', [$group, $membership]), ['action' => 'promote'])
            ->assertForbidden();

        $this->actingAs($member)
            ->post(route('groups.posts.reports.store', [$group, $post]), ['reason' => 'other'])
            ->assertRedirect();
        $report = $group->contentReports()->firstOrFail();

        $this->actingAs($member)
            ->patch(route('groups.reports.review', [$group, $report]), ['action' => 'dismiss'])
            ->assertForbidden();

        $this->actingAs($owner)
            ->patch(route('groups.members.management', [$group, $group->memberships()->where('user_id', $owner->id)->firstOrFail()]), ['action' => 'demote'])
            ->assertForbidden();

        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
    }

    public function test_only_a_group_admin_can_approve_members_and_membership_must_belong_to_group(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $applicant = User::factory()->create();
        $group = $this->createGroup($owner, 'Public cyclists', 'public');
        $otherGroup = $this->createGroup($owner, 'Other cycling group', 'public');
        $membership = $group->memberships()->create([
            'user_id' => $applicant->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        $this->actingAs($member)
            ->patch(route('groups.members.moderate', [$group, $membership]), ['action' => 'approve'])
            ->assertForbidden();

        $this->actingAs($owner)
            ->patch(route('groups.members.moderate', [$otherGroup, $membership]), ['action' => 'approve'])
            ->assertNotFound();

        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'group_id' => $group->id,
            'status' => 'pending',
        ]);
    }

    public function test_group_owner_cannot_leave_and_admin_can_remove_a_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Local artists', 'public');
        $membership = $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);

        $this->actingAs($owner)
            ->delete(route('groups.leave', $group))
            ->assertSessionHasErrors('membership');
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $owner->id,
            'status' => 'approved',
        ]);

        $this->actingAs($owner)
            ->delete(route('groups.members.remove', [$group, $membership]))
            ->assertRedirect();
        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'status' => 'left',
        ]);
    }

    public function test_group_admin_can_invite_a_friend_and_the_invitation_can_be_accepted(): void
    {
        $owner = User::factory()->create();
        $friend = User::factory()->create();
        $existingMember = User::factory()->create();
        $group = $this->createGroup($owner, 'Community gardeners', 'private');
        $group->memberships()->create([
            'user_id' => $existingMember->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        Friendship::query()->create([
            'requester_id' => $owner->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);
        Friendship::query()->create([
            'requester_id' => $owner->id,
            'addressee_id' => $existingMember->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($owner)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('isAdmin', true)
                ->has('inviteableFriends', 1)
                ->where('inviteableFriends.0.id', $friend->id)
            );

        $this->actingAs($owner)
            ->post(route('groups.invitations.store', $group), ['user_id' => $friend->id])
            ->assertRedirect();

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $friend->id,
            'status' => 'invited',
        ]);
        $notification = Notification::query()
            ->where('user_id', $friend->id)
            ->where('type', 'group_invite')
            ->firstOrFail();
        $this->assertSame($group->id, $notification->data['group_id']);

        $this->actingAs($friend)
            ->get(route('groups.show', $group))
            ->assertInertia(fn (Assert $page) => $page
                ->where('isInvited', true)
                ->where('isMember', false)
            );

        $this->actingAs($friend)
            ->post(route('groups.join', $group))
            ->assertRedirect();

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $friend->id,
            'status' => 'approved',
        ]);
    }

    public function test_non_admin_cannot_invite_a_friend_to_a_group(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $friend = User::factory()->create();
        $group = $this->createGroup($owner, 'Community artists', 'public');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);
        Friendship::query()->create([
            'requester_id' => $member->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($member)
            ->post(route('groups.invitations.store', $group), ['user_id' => $friend->id])
            ->assertForbidden();

        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $friend->id,
        ]);
    }

    public function test_group_admin_cannot_invite_a_person_who_is_not_a_friend(): void
    {
        $owner = User::factory()->create();
        $person = User::factory()->create();
        $group = $this->createGroup($owner, 'Community readers', 'private');

        $this->actingAs($owner)
            ->from(route('groups.show', $group))
            ->post(route('groups.invitations.store', $group), ['user_id' => $person->id])
            ->assertRedirect(route('groups.show', $group))
            ->assertSessionHasErrors('user_id');

        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $person->id,
        ]);
    }

    public function test_group_invitation_can_be_declined(): void
    {
        $owner = User::factory()->create();
        $friend = User::factory()->create();
        $group = $this->createGroup($owner, 'Weekend hikers', 'private');
        Friendship::query()->create([
            'requester_id' => $owner->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($owner)
            ->post(route('groups.invitations.store', $group), ['user_id' => $friend->id])
            ->assertRedirect();
        $this->actingAs($friend)
            ->delete(route('groups.invitations.destroy', $group))
            ->assertRedirect(route('groups.index', ['tab' => 'your-groups']));

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $friend->id,
            'status' => 'rejected',
        ]);
        $this->actingAs($friend)->get(route('groups.show', $group))->assertNotFound();
    }

    public function test_group_admin_can_upload_a_cover_that_is_shown_in_group_discovery(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'City photographers', 'public');
        $group->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'approved',
        ]);

        $this->actingAs($owner)
            ->post(route('groups.cover.update', $group), [
                'cover' => UploadedFile::fake()->image('group-cover.jpg'),
            ])
            ->assertRedirect();

        $group->refresh();
        $this->assertNotNull($group->cover_path);
        Storage::disk('public')->assertExists($group->cover_path);
        $this->actingAs($owner)
            ->get(route('groups.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('groups.data.0.cover_url', Storage::disk('public')->url($group->cover_path))
            );

        $this->actingAs($member)
            ->post(route('groups.cover.update', $group), [
                'cover' => UploadedFile::fake()->image('unauthorized-cover.jpg'),
            ])
            ->assertForbidden();

        $this->assertSame($group->cover_path, $group->fresh()->cover_path);
    }

    public function test_member_can_leave_and_rejoin_a_public_group_without_duplicate_memberships(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->createGroup($owner, 'Public musicians', 'public');

        $this->actingAs($member)->post(route('groups.join', $group))->assertRedirect();
        $membership = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $member->id)
            ->firstOrFail();

        $this->actingAs($member)->delete(route('groups.leave', $group))->assertRedirect();
        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'status' => 'left',
        ]);

        $this->actingAs($member)->post(route('groups.join', $group))->assertRedirect();
        $this->assertDatabaseHas('group_memberships', [
            'id' => $membership->id,
            'status' => 'approved',
        ]);
        $this->assertDatabaseCount('group_memberships', 2);
    }

    public function test_unauthenticated_users_cannot_access_groups(): void
    {
        $owner = User::factory()->create();
        $group = $this->createGroup($owner, 'Sign-in required', 'public');

        $this->get(route('groups.index'))->assertRedirect(route('login'));
        $this->get(route('groups.show', $group))->assertRedirect(route('login'));
    }

    private function createGroup(User $owner, string $name, string $privacy): Group
    {
        $group = Group::query()->create([
            'owner_id' => $owner->id,
            'name' => $name,
            'privacy' => $privacy,
        ]);
        $group->memberships()->create([
            'user_id' => $owner->id,
            'role' => 'admin',
            'status' => 'approved',
        ]);

        return $group;
    }
}
