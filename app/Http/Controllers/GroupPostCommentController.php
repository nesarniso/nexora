<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\GroupPost;
use App\Models\GroupPostComment;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GroupPostCommentController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function store(Request $request, Group $group, GroupPost $post): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($post->group_id === $group->id, 404);
        abort_unless($group->isMember($user), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
        ]);

        GroupPostComment::query()->create([
            'group_post_id' => $post->id,
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        if ($post->user_id !== $user->id) {
            $this->notifications->create($post->user, 'group_post_comment', [
                'group_id' => $group->id,
                'group_post_id' => $post->id,
                'actor_id' => $user->id,
                'message' => "{$user->name} commented on your post in {$group->name}.",
            ]);
        }

        return back();
    }
}
