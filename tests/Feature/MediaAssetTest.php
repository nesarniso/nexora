<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaAssetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_user_can_attach_media_to_a_post(): void
    {
        $user = User::factory()->create();
        $post = $user->posts()->create([
            'content' => 'Sharing a new post.',
            'visibility' => 'public',
        ]);

        $file = UploadedFile::fake()->image('sunset.jpg', 1200, 900);

        $response = $this
            ->actingAs($user)
            ->post('/posts/'.$post->id.'/media', [
                'file' => $file,
                'caption' => 'Sunset moments',
            ]);

        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('media_assets', [
            'user_id' => $user->id,
            'attachable_id' => $post->id,
            'attachable_type' => Post::class,
            'type' => 'image',
            'caption' => 'Sunset moments',
        ]);

        $asset = $post->fresh()->mediaAssets()->first();
        $this->assertNotNull($asset);
        $this->assertTrue(Storage::disk('public')->exists($asset->path));
    }

    public function test_user_can_create_a_post_with_media_in_the_composer(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('composer-photo.jpg');

        $response = $this
            ->actingAs($user)
            ->post('/posts', [
                'content' => 'A post created with a photo.',
                'visibility' => 'public',
                'file' => $file,
                'caption' => 'A caption',
            ]);

        $response->assertRedirect(route('dashboard'));

        $post = $user->posts()->where('content', 'A post created with a photo.')->firstOrFail();
        $asset = $post->mediaAssets()->firstOrFail();

        $this->assertSame('A caption', $asset->caption);
        $this->assertTrue(Storage::disk('public')->exists($asset->path));
    }

    public function test_user_can_share_media_without_post_text(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/posts', [
                'file' => UploadedFile::fake()->image('photo-only.jpg'),
            ])
            ->assertRedirect(route('dashboard'));

        $post = $user->posts()->firstOrFail();

        $this->assertSame('', $post->content);
        $this->assertSame(1, $post->mediaAssets()->count());
    }

    public function test_post_requires_text_or_a_media_file(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/dashboard')
            ->post('/posts', [])
            ->assertSessionHasErrors(['content', 'file'])
            ->assertRedirect('/dashboard');

        $this->assertDatabaseCount('posts', 0);
    }

    public function test_invalid_composer_media_does_not_create_a_post(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/dashboard')
            ->post('/posts', [
                'file' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
            ])
            ->assertSessionHasErrors('file')
            ->assertRedirect('/dashboard');

        $this->assertDatabaseCount('posts', 0);
        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_user_cannot_upload_unsupported_media_type(): void
    {
        $user = User::factory()->create();
        $post = $user->posts()->create([
            'content' => 'Test post',
            'visibility' => 'public',
        ]);

        $response = $this
            ->actingAs($user)
            ->post('/posts/'.$post->id.'/media', [
                'file' => UploadedFile::fake()->create('document.pdf', 200, 'application/pdf'),
            ]);

        $response->assertSessionHasErrors('file');
        $this->assertDatabaseCount('media_assets', 0);
    }
}
