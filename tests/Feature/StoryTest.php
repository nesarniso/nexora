<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_user_can_create_a_photo_story_that_expires_after_24_hours(): void
    {
        $this->freezeTime();
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('story.jpg');

        $response = $this
            ->actingAs($user)
            ->from('/dashboard')
            ->post('/stories', [
                'file' => $file,
                'caption' => 'A day outside',
            ]);

        $response->assertRedirect('/dashboard');
        $story = Story::query()->with('mediaAssets')->firstOrFail();
        $this->assertSame('A day outside', $story->caption);
        $this->assertSame(now()->addHours(24)->toDateTimeString(), $story->expires_at->toDateTimeString());
        $this->assertSame('image', $story->mediaAssets->firstOrFail()->type);
        $this->assertTrue(Storage::disk('public')->exists($story->mediaAssets->firstOrFail()->path));
    }

    public function test_dashboard_only_shows_unexpired_stories_from_the_user_and_accepted_friends(): void
    {
        $this->travelTo('2026-10-03 12:00:00');
        $viewer = User::factory()->create();
        $friend = User::factory()->create();
        $pendingContact = User::factory()->create();
        $stranger = User::factory()->create();

        Friendship::query()->create([
            'requester_id' => $viewer->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);
        Friendship::query()->create([
            'requester_id' => $pendingContact->id,
            'addressee_id' => $viewer->id,
            'status' => 'pending',
        ]);

        $this->createStory($viewer, 'viewer.jpg', now()->addHours(24));
        $this->travel(1)->minute();
        $this->createStory($friend, 'friend.jpg', now()->addHours(24));
        $this->createStory($pendingContact, 'pending.jpg', now()->addHours(24));
        $this->createStory($stranger, 'stranger.jpg', now()->addHours(24));
        $this->createStory($friend, 'expired.jpg', now()->subSecond());

        $this->actingAs($viewer)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('stories', 2)
                ->where('stories.0.user.id', $friend->id)
                ->where('stories.1.user.id', $viewer->id)
            );
    }

    public function test_user_cannot_create_a_story_with_an_unsupported_file(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/dashboard')
            ->post('/stories', [
                'file' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
            ])
            ->assertRedirect('/dashboard')
            ->assertSessionHasErrors('file');

        $this->assertDatabaseCount('stories', 0);
        $this->assertDatabaseCount('media_assets', 0);
    }

    private function createStory(User $user, string $filename, \DateTimeInterface $expiresAt): Story
    {
        $story = $user->stories()->create([
            'expires_at' => $expiresAt,
        ]);
        $path = 'stories/'.$filename;
        Storage::disk('public')->put($path, 'story media');
        $story->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'image',
            'path' => $path,
            'mime_type' => 'image/jpeg',
            'file_name' => $filename,
            'size' => 11,
            'status' => 'uploaded',
        ]);

        return $story;
    }
}
