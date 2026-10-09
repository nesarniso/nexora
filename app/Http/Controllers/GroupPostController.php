<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\GroupPost;
use App\Models\GroupPostReaction;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class GroupPostController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function update(Request $request, Group $group, GroupPost $post): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->authorizeMember($group, $post, $user);
        abort_unless($post->user_id === $user->id, 403);

        $validated = $request->validate([
            'content' => ['present', 'nullable', 'string', 'max:2000'],
        ]);
        $content = trim($validated['content'] ?? '');

        if ($content === '' && $post->image_path === null) {
            throw ValidationException::withMessages([
                'content' => 'A post must contain text or an image.',
            ]);
        }

        $post->update(['content' => $content]);

        return back();
    }

    public function destroy(Request $request, Group $group, GroupPost $post): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->authorizeMember($group, $post, $user);
        abort_unless($post->user_id === $user->id || $group->isAdmin($user), 403);

        $imagePath = $post->image_path;
        $post->delete();

        if (
            $imagePath !== null
            && ! GroupPost::query()->where('image_path', $imagePath)->exists()
            && Storage::disk('public')->exists($imagePath)
            && ! Storage::disk('public')->delete($imagePath)
        ) {
            throw new \RuntimeException('The group post image could not be deleted.');
        }

        return back();
    }

    public function toggleReaction(Request $request, Group $group, GroupPost $post): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->authorizeMember($group, $post, $user);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:like,love,celebrate,insightful,support'],
        ]);

        $reaction = $post->reactions()->where('user_id', $user->id)->first();

        if ($reaction && $reaction->type === $validated['type']) {
            $reaction->delete();

            return back();
        }

        if ($reaction) {
            $reaction->update(['type' => $validated['type']]);
        } else {
            GroupPostReaction::query()->create([
                'group_post_id' => $post->id,
                'user_id' => $user->id,
                'type' => $validated['type'],
            ]);

            if ($post->user_id !== $user->id) {
                $this->notifications->create($post->user, 'group_post_reaction', [
                    'group_id' => $group->id,
                    'group_post_id' => $post->id,
                    'actor_id' => $user->id,
                    'message' => "{$user->name} reacted to your post in {$group->name}.",
                ]);
            }
        }

        return back();
    }

    private function authorizeMember(Group $group, GroupPost $post, User $user): void
    {
        abort_unless($post->group_id === $group->id, 404);
        abort_unless($group->isMember($user), 403);
    }
}
