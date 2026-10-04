<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Profile/Show')
            ->where('user.name', $user->name)
            ->where('profile.username', $user->profile->username)
            ->has('posts.data', 0)
        );
    }

    public function test_profile_settings_page_is_available_separately(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/profile/edit')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Edit')
                ->where('profile.username', $user->profile->username)
            );
    }

    public function test_profile_page_requires_authentication(): void
    {
        $this->get('/profile')->assertRedirect('/login');
    }

    public function test_about_section_opens_as_its_own_profile_page(): void
    {
        $user = User::factory()->create();
        $user->profile()->update([
            'bio' => 'About this user',
            'location' => 'Dhaka',
        ]);

        $this->actingAs($user)
            ->get(route('profile.section', 'about'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('section', 'about')
                ->where('profile.bio', 'About this user')
                ->where('profile.location', 'Dhaka')
            );
    }

    public function test_friends_section_opens_as_its_own_profile_page(): void
    {
        $viewer = User::factory()->create();
        $profileOwner = User::factory()->create();
        $friend = User::factory()->create(['name' => 'Profile Friend']);
        Friendship::query()->create([
            'requester_id' => $profileOwner->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($viewer)
            ->get(route('users.section', ['user' => $profileOwner, 'section' => 'friends']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('section', 'friends')
                ->where('friendCount', 1)
                ->has('sectionFriends.data', 1)
                ->where('sectionFriends.data.0.name', 'Profile Friend')
            );
    }

    public function test_photos_section_opens_as_its_own_profile_page_and_respects_post_visibility(): void
    {
        $viewer = User::factory()->create();
        $profileOwner = User::factory()->create();
        $publicPost = $profileOwner->posts()->create([
            'content' => 'Public photo post',
            'visibility' => 'public',
        ]);
        $friendsPost = $profileOwner->posts()->create([
            'content' => 'Friends photo post',
            'visibility' => 'friends',
        ]);
        $privatePost = $profileOwner->posts()->create([
            'content' => 'Private photo post',
            'visibility' => 'only_me',
        ]);

        foreach ([$publicPost, $friendsPost, $privatePost] as $post) {
            $post->mediaAssets()->create([
                'user_id' => $profileOwner->id,
                'type' => 'image',
                'path' => 'media/'.$post->content.'.jpg',
                'mime_type' => 'image/jpeg',
                'file_name' => $post->content.'.jpg',
                'size' => 1024,
                'caption' => $post->content,
                'status' => 'uploaded',
            ]);
        }

        $this->actingAs($viewer)
            ->get(route('users.section', ['user' => $profileOwner, 'section' => 'photos']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('section', 'photos')
                ->has('sectionPhotos.data', 1)
                ->where('sectionPhotos.data.0.caption', 'Public photo post')
            );
    }

    public function test_timeline_author_profile_shows_only_posts_visible_to_the_viewer(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();
        $author->posts()->create([
            'content' => 'Public post on this profile',
            'visibility' => 'public',
        ]);
        $author->posts()->create([
            'content' => 'Private post on this profile',
            'visibility' => 'only_me',
        ]);
        $author->posts()->create([
            'content' => 'Friends-only post on this profile',
            'visibility' => 'friends',
        ]);

        $this->actingAs($viewer)
            ->get(route('users.show', $author))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('user.id', $author->id)
                ->where('isOwnProfile', false)
                ->where('friendship', null)
                ->has('posts.data', 1)
                ->where('posts.data.0.content', 'Public post on this profile')
            );
    }

    public function test_profile_shows_the_incoming_or_outgoing_friend_request_state(): void
    {
        $viewer = User::factory()->create();
        $requester = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $viewer->id,
            'status' => 'pending',
        ]);

        $this->actingAs($viewer)
            ->get(route('users.show', $requester))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('friendship.status', 'pending')
                ->where('friendship.isOutgoing', false)
            );
    }

    public function test_profile_shows_when_the_viewer_already_sent_a_friend_request(): void
    {
        $viewer = User::factory()->create();
        $profileOwner = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $viewer->id,
            'addressee_id' => $profileOwner->id,
            'status' => 'pending',
        ]);

        $this->actingAs($viewer)
            ->get(route('users.show', $profileOwner))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('friendship.status', 'pending')
                ->where('friendship.isOutgoing', true)
            );
    }

    public function test_visitor_can_send_a_friend_request_from_another_users_profile(): void
    {
        $viewer = User::factory()->create();
        $profileOwner = User::factory()->create();

        $this->actingAs($viewer)
            ->from(route('users.show', $profileOwner))
            ->post(route('friend-request.store', $profileOwner))
            ->assertRedirect(route('users.show', $profileOwner));

        $this->assertDatabaseHas('friendships', [
            'requester_id' => $viewer->id,
            'addressee_id' => $profileOwner->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $profileOwner->id,
            'type' => 'friend_request_received',
        ]);
    }

    public function test_requester_can_cancel_an_outgoing_friend_request_from_profile(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);

        $this->actingAs($requester)
            ->from(route('users.show', $addressee))
            ->post(route('friend-request.cancel', $addressee))
            ->assertRedirect(route('users.show', $addressee));

        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'rejected',
        ]);
    }

    public function test_addressee_cannot_cancel_someone_elses_outgoing_request(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);

        $this->actingAs($addressee)
            ->from(route('users.show', $requester))
            ->post(route('friend-request.cancel', $requester))
            ->assertRedirect(route('users.show', $requester))
            ->assertSessionHasErrors('friend_request');

        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);
    }

    public function test_friend_can_see_friends_only_posts_on_a_timeline_author_profile(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $author->id,
            'addressee_id' => $viewer->id,
            'status' => 'accepted',
        ]);
        $author->posts()->create([
            'content' => 'Friends can see this profile post',
            'visibility' => 'friends',
        ]);

        $this->actingAs($viewer)
            ->get(route('users.show', $author))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('user.id', $author->id)
                ->where('isOwnProfile', false)
                ->where('friendship.status', 'accepted')
                ->has('posts.data', 1)
                ->where('posts.data.0.content', 'Friends can see this profile post')
            );
    }

    public function test_profile_shows_only_the_owner_posts_and_includes_their_friend_count(): void
    {
        $user = User::factory()->create();
        $friend = User::factory()->create();
        $otherUser = User::factory()->create();

        $user->posts()->create([
            'content' => 'My profile post',
            'visibility' => 'only_me',
        ]);
        $otherUser->posts()->create([
            'content' => 'Someone else post',
            'visibility' => 'public',
        ]);
        $user->sentFriendRequests()->create([
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($user)
            ->get('/profile')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->where('friendCount', 1)
                ->has('posts.data', 1)
                ->where('posts.data.0.content', 'My profile post')
            );
    }

    public function test_profile_exposes_post_images_and_videos_for_their_sections(): void
    {
        $user = User::factory()->create();
        $post = $user->posts()->create([
            'content' => 'A post with media',
            'visibility' => 'public',
        ]);

        $post->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'image',
            'path' => 'media/profile-photo.jpg',
            'mime_type' => 'image/jpeg',
            'file_name' => 'profile-photo.jpg',
            'size' => 1024,
            'caption' => 'A photo',
            'status' => 'uploaded',
        ]);
        $post->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'video',
            'path' => 'media/profile-reel.mp4',
            'mime_type' => 'video/mp4',
            'file_name' => 'profile-reel.mp4',
            'size' => 2048,
            'caption' => 'A reel',
            'status' => 'uploaded',
        ]);

        $this->actingAs($user)
            ->get('/profile')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Show')
                ->has('photos', 1)
                ->where('photos.0.caption', 'A photo')
                ->has('galleryPhotos', 1)
                ->where('galleryPhotos.0.caption', 'A photo')
                ->has('videos', 1)
                ->where('videos.0.caption', 'A reel')
                ->has('posts.data.0.media_assets', 2)
            );
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile/edit');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_photos_can_be_updated_with_valid_urls(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => 'https://images.example.test/avatar.jpg',
                'cover_url' => 'https://images.example.test/cover.jpg',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile/edit');

        $this->assertSame('https://images.example.test/avatar.jpg', $user->profile->fresh()->avatar_url);
        $this->assertSame('https://images.example.test/cover.jpg', $user->profile->fresh()->cover_url);
        $this->assertSame(2, $user->posts()->count());
        $this->assertSame(
            'https://images.example.test/avatar.jpg',
            $user->posts()->where('content', 'updated their profile photo')->firstOrFail()->mediaAssets()->firstOrFail()->path,
        );

        $this->actingAs($user)
            ->get('/dashboard?search=cover')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('posts.data', 1)
                ->where('posts.data.0.media_assets.0.url', 'https://images.example.test/cover.jpg')
            );
    }

    public function test_user_can_upload_and_replace_profile_photo_while_preserving_cover_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $oldAvatarPath = 'profile-photos/'.$user->id.'/avatar/old-avatar.jpg';
        Storage::disk('public')->put($oldAvatarPath, 'old avatar');
        $user->profile()->update([
            'avatar_url' => Storage::disk('public')->url($oldAvatarPath),
            'cover_url' => 'https://images.example.test/cover.jpg',
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->post('/profile/photos', [
                'avatar' => UploadedFile::fake()->image('new-avatar.jpg'),
            ]);

        $response->assertRedirect('/profile');
        $profile = $user->profile->fresh();
        $avatarPath = str_replace(Storage::disk('public')->url(''), '', $profile->avatar_url);
        $this->assertStringStartsWith('profile-photos/'.$user->id.'/avatar/', $avatarPath);
        $this->assertTrue(Storage::disk('public')->exists($avatarPath));
        $this->assertFalse(Storage::disk('public')->exists($oldAvatarPath));
        $this->assertSame('https://images.example.test/cover.jpg', $profile->cover_url);

        $post = $user->posts()->where('content', 'updated their profile photo')->firstOrFail();
        $this->assertSame('public', $post->visibility);
        $this->assertSame($avatarPath, $post->mediaAssets()->firstOrFail()->path);
    }

    public function test_user_can_upload_a_cover_photo_without_changing_the_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $user->profile()->update(['avatar_url' => 'https://images.example.test/avatar.jpg']);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->post('/profile/photos', [
                'cover' => UploadedFile::fake()->image('new-cover.png'),
            ]);

        $response->assertRedirect('/profile');
        $profile = $user->profile->fresh();
        $coverPath = str_replace(Storage::disk('public')->url(''), '', $profile->cover_url);
        $this->assertStringStartsWith('profile-photos/'.$user->id.'/cover/', $coverPath);
        $this->assertTrue(Storage::disk('public')->exists($coverPath));
        $this->assertSame('https://images.example.test/avatar.jpg', $profile->avatar_url);

        $post = $user->posts()->where('content', 'updated their cover photo')->firstOrFail();
        $this->assertSame('public', $post->visibility);
        $this->assertSame($coverPath, $post->mediaAssets()->firstOrFail()->path);
    }

    public function test_user_can_set_profile_photo_from_their_post_gallery(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $galleryPost = $user->posts()->create([
            'content' => 'Photo for my gallery',
            'visibility' => 'public',
        ]);
        $galleryPath = 'media/gallery-photo.jpg';
        Storage::disk('public')->put($galleryPath, 'gallery photo');
        $galleryPhoto = $galleryPost->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'image',
            'path' => $galleryPath,
            'mime_type' => 'image/jpeg',
            'file_name' => 'gallery-photo.jpg',
            'size' => 1024,
            'status' => 'uploaded',
        ]);

        $this->actingAs($user)
            ->from('/profile')
            ->post('/profile/photos', ['gallery_photo_id' => $galleryPhoto->id])
            ->assertRedirect('/profile');

        $this->assertSame(Storage::disk('public')->url($galleryPath), $user->profile->fresh()->avatar_url);
        $this->assertSame(2, $user->posts()->count());
        $profilePhotoPost = $user->posts()->where('content', 'updated their profile photo')->firstOrFail();
        $this->assertSame($galleryPath, $profilePhotoPost->mediaAssets()->firstOrFail()->path);
    }

    public function test_user_cannot_set_profile_photo_from_another_users_gallery(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $galleryPost = $otherUser->posts()->create([
            'content' => 'Another users photo',
            'visibility' => 'public',
        ]);
        $galleryPhoto = $galleryPost->mediaAssets()->create([
            'user_id' => $otherUser->id,
            'type' => 'image',
            'path' => 'media/other-user-photo.jpg',
            'mime_type' => 'image/jpeg',
            'file_name' => 'other-user-photo.jpg',
            'size' => 1024,
            'status' => 'uploaded',
        ]);

        $this->actingAs($user)
            ->post('/profile/photos', ['gallery_photo_id' => $galleryPhoto->id])
            ->assertNotFound();

        $this->assertNull($user->profile->fresh()->avatar_url);
        $this->assertSame(0, $user->posts()->count());
    }

    public function test_user_cannot_upload_an_unsupported_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->post('/profile/photos', [
                'avatar' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
            ])
            ->assertRedirect('/profile')
            ->assertSessionHasErrors('avatar');

        $this->assertNull($user->profile->fresh()->avatar_url);
        $this->assertNull($user->profile->fresh()->cover_url);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_profile_photo_upload_requires_authentication(): void
    {
        Storage::fake('public');

        $this->post('/profile/photos', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ])->assertRedirect('/login');

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_profile_photo_urls_must_be_valid_urls(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile/edit')
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => 'not-a-url',
                'cover_url' => 'also-not-a-url',
            ])
            ->assertSessionHasErrors(['avatar_url', 'cover_url'])
            ->assertRedirect('/profile/edit');

        $this->assertNull($user->profile->fresh()->avatar_url);
        $this->assertNull($user->profile->fresh()->cover_url);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile/edit');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile/edit')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile/edit');

        $this->assertNotNull($user->fresh());
    }
}
