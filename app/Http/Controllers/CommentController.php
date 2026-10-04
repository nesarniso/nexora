<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use App\Services\PrivacyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request, Post $post): RedirectResponse
    {
        abort_unless(PrivacyService::canViewPost($request->user(), $post), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
        ]);

        Comment::query()->create([
            'user_id' => $request->user()->id,
            'post_id' => $post->id,
            'body' => $validated['body'],
        ]);

        return redirect()->back();
    }
}
