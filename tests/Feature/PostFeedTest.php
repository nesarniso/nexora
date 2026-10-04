<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PostFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_search_matches_post_content_without_exposing_private_posts(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();

        $author->posts()->create([
            'content' => 'Release notes for the community',
            'visibility' => 'public',
        ]);
        $author->posts()->create([
            'content' => 'Private release notes',
            'visibility' => 'only_me',
        ]);

        $this->actingAs($viewer)
            ->get('/dashboard?search=release')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('filters.search', 'release')
                ->has('posts.data', 1)
                ->where('posts.data.0.content', 'Release notes for the community')
            );
    }

    public function test_dashboard_shares_the_current_users_profile_photo_for_avatar_display(): void
    {
        $user = User::factory()->create();
        $user->profile()->update(['avatar_url' => 'https://images.example.test/profile-photo.jpg']);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('auth.user.profile.avatar_url', 'https://images.example.test/profile-photo.jpg')
            );
    }

    public function test_dashboard_search_matches_the_post_author_name(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create(['name' => 'Unique Searchable Author']);
        $author->posts()->create([
            'content' => 'An unrelated post',
            'visibility' => 'public',
        ]);

        $this->actingAs($viewer)
            ->get('/dashboard?search=Searchable')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('posts.data', 1)
                ->where('posts.data.0.user.name', 'Unique Searchable Author')
            );
    }

    public function test_dashboard_filters_posts_by_visibility(): void
    {
        $viewer = User::factory()->create();
        $otherUser = User::factory()->create();

        $viewer->posts()->create(['content' => 'Public post', 'visibility' => 'public']);
        $viewer->posts()->create(['content' => 'Friends post', 'visibility' => 'friends']);
        $viewer->posts()->create(['content' => 'Only-me post', 'visibility' => 'only_me']);
        $otherUser->posts()->create(['content' => 'Another public post', 'visibility' => 'public']);

        $this->actingAs($viewer)
            ->get('/dashboard?visibility=public')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('filters.visibility', 'public')
                ->has('posts.data', 2)
            );
    }

    public function test_deleting_a_profile_photo_update_post_keeps_the_current_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/profile/photos', ['avatar' => UploadedFile::fake()->image('avatar.jpg')])
            ->assertRedirect();

        $avatarUrl = $user->profile->fresh()->avatar_url;
        $avatarPath = str_replace(Storage::disk('public')->url(''), '', $avatarUrl);
        $photoPost = $user->posts()->where('content', 'updated their profile photo')->firstOrFail();

        $this->from('/dashboard')
            ->delete(route('posts.destroy', $photoPost))
            ->assertRedirect('/dashboard');

        $this->assertDatabaseMissing('posts', ['id' => $photoPost->id]);
        $this->assertSame($avatarUrl, $user->profile->fresh()->avatar_url);
        $this->assertTrue(Storage::disk('public')->exists($avatarPath));
        $this->assertDatabaseMissing('media_assets', [
            'attachable_type' => Post::class,
            'attachable_id' => $photoPost->id,
        ]);
    }

    public function test_deleting_a_post_removes_its_unreferenced_media_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $post = $user->posts()->create([
            'content' => 'A post with an image',
            'visibility' => 'public',
        ]);
        $mediaPath = 'media/post-image.jpg';
        Storage::disk('public')->put($mediaPath, 'post image');
        $post->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'image',
            'path' => $mediaPath,
            'mime_type' => 'image/jpeg',
            'file_name' => 'post-image.jpg',
            'size' => 1024,
            'status' => 'uploaded',
        ]);

        $this->actingAs($user)
            ->from('/dashboard')
            ->delete(route('posts.destroy', $post))
            ->assertRedirect('/dashboard');

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertFalse(Storage::disk('public')->exists($mediaPath));
    }

    public function test_user_cannot_delete_another_users_post(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();
        $post = $author->posts()->create([
            'content' => 'A post owned by another user',
            'visibility' => 'public',
        ]);

        $this->actingAs($viewer)
            ->delete(route('posts.destroy', $post))
            ->assertForbidden();

        $this->assertModelExists($post);
        $this->assertSame('A post owned by another user', $post->fresh()->content);
    }
}
