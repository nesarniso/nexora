<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_accepted_friends_can_view_and_engage_with_friends_only_posts(): void
    {
        $author = User::factory()->create();
        $friend = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $author->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);
        $post = Post::query()->create([
            'user_id' => $author->id,
            'content' => 'A friends-only update.',
            'visibility' => 'friends',
        ]);

        $this->actingAs($friend)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('posts.data.0.content', 'A friends-only update.')
            );

        $this->actingAs($friend)
            ->post('/posts/'.$post->id.'/comments', ['body' => 'Thanks for sharing.'])
            ->assertRedirect();

        $this->actingAs($friend)
            ->post('/posts/'.$post->id.'/reactions', ['type' => 'like'])
            ->assertRedirect();

        $this->assertDatabaseHas('comments', [
            'post_id' => $post->id,
            'user_id' => $friend->id,
            'body' => 'Thanks for sharing.',
        ]);
        $this->assertDatabaseHas('reactions', [
            'post_id' => $post->id,
            'user_id' => $friend->id,
            'type' => 'like',
        ]);
    }

    public function test_pending_friend_request_does_not_grant_access_to_friends_only_posts(): void
    {
        $author = User::factory()->create();
        $requester = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $author->id,
            'addressee_id' => $requester->id,
            'status' => 'pending',
        ]);
        $author->posts()->create([
            'content' => 'Not visible until accepted.',
            'visibility' => 'friends',
        ]);

        $this->actingAs($requester)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('posts.data', 0)
            );
    }

    public function test_non_friend_cannot_comment_on_or_react_to_friends_only_posts(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $post = $author->posts()->create([
            'content' => 'Friends only.',
            'visibility' => 'friends',
        ]);

        $this->actingAs($viewer)
            ->post('/posts/'.$post->id.'/comments', ['body' => 'I should not see this.'])
            ->assertForbidden();

        $this->actingAs($viewer)
            ->post('/posts/'.$post->id.'/reactions', ['type' => 'like'])
            ->assertForbidden();

        $this->assertDatabaseMissing('comments', [
            'post_id' => $post->id,
            'user_id' => $viewer->id,
        ]);
        $this->assertDatabaseMissing('reactions', [
            'post_id' => $post->id,
            'user_id' => $viewer->id,
        ]);
    }
}
