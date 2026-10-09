<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;

class SavedPostController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $posts = $user->savedPosts()
            ->visibleTo($user)
            ->with(['user.profile', 'mediaAssets'])
            ->withCount(['comments', 'reactions'])
            ->latest()
            ->paginate(10);

        $posts->getCollection()->each(function (Post $post) use ($user) {
            $post->mediaAssets->each(fn ($asset) => $asset->setAttribute('url', $asset->publicUrl()));
            // mark as saved for the current viewer
            $post->setAttribute('is_saved', true);
        });

        return Inertia::render('SavedPosts/Index', [
            'posts' => $posts,
        ]);
    }

    public function store(Request $request, Post $post): RedirectResponse
    {
        $user = $request->user();

        // cannot save a post the user cannot view
        abort_unless(Post::query()->visibleTo($user)->whereKey($post->id)->exists(), 403);

        $user->savedPosts()->syncWithoutDetaching([$post->id]);

        return redirect()->back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        $user = $request->user();

        $user->savedPosts()->detach($post->id);

        return redirect()->back();
    }
}
