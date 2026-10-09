<?php

namespace App\Services;

use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\Story;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class MediaService
{
    public function createForPost(Post $post, UploadedFile $file, ?string $caption = null): MediaAsset
    {
        return $this->createForOwner($post->mediaAssets(), $post->user_id, $file, $caption);
    }

    public function createForStory(Story $story, UploadedFile $file): MediaAsset
    {
        return $this->createForOwner($story->mediaAssets(), $story->user_id, $file, $story->caption);
    }

    private function createForOwner(
        MorphMany $mediaAssets,
        int $userId,
        UploadedFile $file,
        ?string $caption,
    ): MediaAsset {
        $mimeType = $file->getMimeType() ?? 'application/octet-stream';
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');

        $type = str_starts_with($mimeType, 'image/') ? 'image' : 'video';

        $path = $file->storeAs('media', Str::uuid().'.'.$extension, 'public');

        return $mediaAssets->create([
            'user_id' => $userId,
            'type' => $type,
            'path' => $path,
            'mime_type' => $mimeType,
            'file_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'caption' => $caption,
            'status' => 'uploaded',
        ]);
    }
}
