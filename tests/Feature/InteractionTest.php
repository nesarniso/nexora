<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InteractionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_comment_on_a_public_post(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $post = Post::query()->create([
            'user_id' => $author->id,
            'content' => 'Looking forward to the next release.',
            'visibility' => 'public',
        ]);

        $response = $this
            ->actingAs($viewer)
            ->post('/posts/'.$post->id.'/comments', [
                'body' => 'This is a great update.',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('comments', [
            'user_id' => $viewer->id,
            'post_id' => $post->id,
            'body' => 'This is a great update.',
        ]);
    }

    public function test_user_can_toggle_a_reaction_on_a_post(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $post = Post::query()->create([
            'user_id' => $author->id,
            'content' => 'Ship it today.',
            'visibility' => 'public',
        ]);

        $response = $this
            ->actingAs($viewer)
            ->post('/posts/'.$post->id.'/reactions', [
                'type' => 'love',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('reactions', [
            'user_id' => $viewer->id,
            'post_id' => $post->id,
            'type' => 'love',
        ]);

        $this->assertNotNull($post->fresh()->reactions()->where('user_id', $viewer->id)->first());

        $this->actingAs($viewer)
            ->post('/posts/'.$post->id.'/reactions', [
                'type' => 'love',
            ]);

        $this->assertDatabaseMissing('reactions', [
            'user_id' => $viewer->id,
            'post_id' => $post->id,
        ]);
    }

    public function test_dashboard_provides_post_comments_counts_and_the_viewers_reaction(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $post = $author->posts()->create([
            'content' => 'A post with engagement.',
            'visibility' => 'public',
        ]);
        $post->comments()->create([
            'user_id' => $viewer->id,
            'body' => 'A recent comment.',
        ]);
        $post->reactions()->create([
            'user_id' => $viewer->id,
            'type' => 'love',
        ]);
        $post->reactions()->create([
            'user_id' => $author->id,
            'type' => 'like',
        ]);

        $this->actingAs($viewer)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('posts.data.0.comments_count', 1)
                ->where('posts.data.0.reactions_count', 2)
                ->has('posts.data.0.comments', 1)
                ->where('posts.data.0.comments.0.body', 'A recent comment.')
                ->has('posts.data.0.reactions', 1)
                ->where('posts.data.0.reactions.0.type', 'love')
            );
    }
}
