<?php

namespace App\Http\Controllers;

use App\Services\MediaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoryController extends Controller
{
    public function store(Request $request, MediaService $mediaService): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi,m4v', 'max:25000'],
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $mediaService, $validated): void {
            $story = $request->user()->stories()->create([
                'caption' => $validated['caption'] ?? null,
                'expires_at' => now()->addHours(24),
            ]);

            $mediaService->createForStory($story, $request->file('file'));
        });

        return back();
    }
}
