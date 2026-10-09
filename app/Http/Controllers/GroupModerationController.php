<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\GroupContentReport;
use App\Models\GroupMembership;
use App\Models\GroupPost;
use App\Models\GroupPostComment;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GroupModerationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function reportPost(Request $request, Group $group, GroupPost $post): RedirectResponse
    {
        abort_unless($post->group_id === $group->id, 404);

        return $this->createReport($request, $group, $post, null);
    }

    public function reportComment(
        Request $request,
        Group $group,
        GroupPost $post,
        GroupPostComment $comment,
    ): RedirectResponse {
        abort_unless($post->group_id === $group->id, 404);
        abort_unless($comment->group_post_id === $post->id, 404);

        return $this->createReport($request, $group, $post, $comment);
    }

    public function destroyComment(
        Request $request,
        Group $group,
        GroupPost $post,
        GroupPostComment $comment,
    ): RedirectResponse {
        abort_unless($group->isAdmin($request->user()), 403);
        abort_unless($post->group_id === $group->id, 404);
        abort_unless($comment->group_post_id === $post->id, 404);

        $comment->delete();

        return back();
    }

    public function updateMember(
        Request $request,
        Group $group,
        GroupMembership $membership,
    ): RedirectResponse {
        abort_unless($group->isAdmin($request->user()), 403);
        abort_unless($membership->group_id === $group->id, 404);
        abort_if($membership->user_id === $group->owner_id, 403);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['promote', 'demote', 'suspend', 'restore', 'remove'])],
        ]);

        $action = $validated['action'];
        $this->assertMemberActionIsAllowed($membership, $action);

        $updates = match ($action) {
            'promote' => ['role' => 'admin'],
            'demote' => ['role' => 'member'],
            'suspend' => ['status' => 'suspended'],
            'restore' => ['status' => 'approved'],
            'remove' => ['status' => 'left'],
        };
        $membership->update($updates);

        $message = match ($action) {
            'promote' => "You are now an admin of {$group->name}.",
            'demote' => "Your admin role in {$group->name} has been removed.",
            'suspend' => "Your membership in {$group->name} has been suspended.",
            'restore' => "Your membership in {$group->name} has been restored.",
            'remove' => "You have been removed from {$group->name}.",
        };

        $this->notifications->create($membership->user, 'group_membership_updated', [
            'group_id' => $group->id,
            'message' => $message,
        ]);

        return back();
    }

    public function reviewReport(
        Request $request,
        Group $group,
        GroupContentReport $report,
    ): RedirectResponse {
        abort_unless($group->isAdmin($request->user()), 403);
        abort_unless($report->group_id === $group->id, 404);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['dismiss', 'remove_content'])],
        ]);

        abort_unless($report->status === 'open', 409);

        $report->load(['post', 'comment']);
        $post = $report->post;
        $comment = $report->comment;
        $imagePath = null;

        DB::transaction(function () use ($report, $request, $validated, $post, $comment, &$imagePath): void {
            $report->update([
                'status' => $validated['action'] === 'dismiss' ? 'dismissed' : 'resolved',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            if ($validated['action'] !== 'remove_content') {
                return;
            }

            if ($post !== null) {
                $imagePath = $post->image_path;
                $post->delete();
            } elseif ($comment !== null) {
                $comment->delete();
            }
        });

        if (
            $imagePath !== null
            && ! GroupPost::query()->where('image_path', $imagePath)->exists()
            && Storage::disk('public')->exists($imagePath)
            && ! Storage::disk('public')->delete($imagePath)
        ) {
            throw new \RuntimeException('The reported group post image could not be deleted.');
        }

        $reporter = $report->reporter;
        if ($reporter !== null && $reporter->id !== $request->user()->id) {
            $this->notifications->create($reporter, 'group_report_resolved', [
                'group_id' => $group->id,
                'message' => $validated['action'] === 'dismiss'
                    ? "Your report in {$group->name} was reviewed and dismissed."
                    : "Your report in {$group->name} was reviewed and action was taken.",
            ]);
        }

        return back();
    }

    private function createReport(
        Request $request,
        Group $group,
        GroupPost $post,
        ?GroupPostComment $comment,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($group->isMember($user), 403);
        abort_if(($comment?->user_id ?? $post->user_id) === $user->id, 403);

        $validated = $request->validate([
            'reason' => ['required', Rule::in(['spam', 'harassment', 'inappropriate', 'misinformation', 'other'])],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        $existingReport = $group->contentReports()
            ->where('reporter_id', $user->id)
            ->where('status', 'open')
            ->when(
                $comment !== null,
                fn ($query) => $query->where('group_post_comment_id', $comment->id),
                fn ($query) => $query->where('group_post_id', $post->id)->whereNull('group_post_comment_id'),
            )
            ->exists();

        if ($existingReport) {
            throw ValidationException::withMessages([
                'reason' => 'You already have an open report for this content.',
            ]);
        }

        $report = $group->contentReports()->create([
            'reporter_id' => $user->id,
            'group_post_id' => $comment === null ? $post->id : null,
            'group_post_comment_id' => $comment?->id,
            'target_type' => $comment === null ? 'post' : 'comment',
            ...$validated,
        ]);

        $admins = $group->memberships()
            ->where('role', 'admin')
            ->where('status', 'approved')
            ->with('user')
            ->get();

        foreach ($admins as $admin) {
            if ($admin->user_id === $user->id) {
                continue;
            }

            $this->notifications->create($admin->user, 'group_content_reported', [
                'group_id' => $group->id,
                'report_id' => $report->id,
                'message' => "{$user->name} reported content in {$group->name}.",
            ]);
        }

        return back();
    }

    private function assertMemberActionIsAllowed(GroupMembership $membership, string $action): void
    {
        $allowed = match ($action) {
            'promote', 'suspend' => $membership->status === 'approved' && $membership->role === 'member',
            'demote' => $membership->status === 'approved' && $membership->role === 'admin',
            'restore' => $membership->status === 'suspended',
            'remove' => in_array($membership->status, ['approved', 'suspended'], true) && $membership->role === 'member',
        };

        abort_unless($allowed, 409);
    }
}
