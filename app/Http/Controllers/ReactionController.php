<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Reaction;
use App\Services\PrivacyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReactionController extends Controller
{
    public function store(Request $request, Post $post): RedirectResponse
    {
        abort_unless(PrivacyService::canViewPost($request->user(), $post), 403);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:like,love,celebrate,insightful,support'],
        ]);

        $reaction = $post->reactions()->where('user_id', $request->user()->id)->first();

        if ($reaction && $reaction->type === $validated['type']) {
            $reaction->delete();

            return redirect()->back();
        }

        if ($reaction) {
            $reaction->update(['type' => $validated['type']]);

            return redirect()->back();
        }

        Reaction::query()->create([
            'user_id' => $request->user()->id,
            'post_id' => $post->id,
            'type' => $validated['type'],
        ]);

        return redirect()->back();
    }
}
