<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMediaAssetRequest;
use App\Models\Post;
use App\Services\MediaService;
use Illuminate\Http\RedirectResponse;

class MediaAssetController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreMediaAssetRequest $request, Post $post): RedirectResponse
    {
        abort_unless($post->user_id === $request->user()?->id, 403);

        $this->mediaService->createForPost(
            $post,
            $request->file('file'),
            $request->input('caption')
        );

        return redirect()->route('dashboard')->with('status', 'Media uploaded successfully.');
    }
}
