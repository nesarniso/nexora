<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\Group;
use App\Models\GroupContentReport;
use App\Models\GroupMembership;
use App\Models\GroupPost;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GroupController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'tab' => ['nullable', Rule::in(['discover', 'your-groups'])],
        ]);
        $tab = $filters['tab'] ?? 'discover';

        $groups = Group::query()
            ->when($tab === 'your-groups', function ($query) use ($user): void {
                $query->whereHas('memberships', fn ($membership) => $membership
                    ->where('user_id', $user->id)
                    ->whereIn('status', ['approved', 'pending', 'invited']));
            }, function ($query) use ($user): void {
                $query->where(function ($visible) use ($user): void {
                    $visible->where('privacy', 'public')
                        ->orWhereHas('memberships', fn ($membership) => $membership
                            ->where('user_id', $user->id)
                            ->whereIn('status', ['approved', 'pending', 'invited']));
                });
            })
            ->when(filled($filters['search'] ?? null), function ($query) use ($filters): void {
                $search = trim($filters['search']);
                $query->where(function ($matches) use ($search): void {
                    $matches->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->with('owner:id,name')
            ->withCount('members')
            ->with(['memberships' => fn ($membership) => $membership
                ->where('user_id', $user->id)
                ->select(['id', 'group_id', 'user_id', 'role', 'status'])])
            ->latest()
            ->paginate(12)
            ->withQueryString();

        $groups->through(fn (Group $group): Group => $group->setAttribute(
            'cover_url',
            $group->cover_path ? Storage::disk('public')->url($group->cover_path) : null,
        ));

        $managedGroups = Group::query()
            ->whereHas('memberships', fn ($membership) => $membership
                ->where('user_id', $user->id)
                ->where('role', 'admin')
                ->where('status', 'approved'))
            ->withCount([
                'members',
                'memberships as pending_members_count' => fn ($membership) => $membership->where('status', 'pending'),
            ])
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Group $group): array => [
                'id' => $group->id,
                'name' => $group->name,
                'member_count' => $group->members_count,
                'pending_members_count' => $group->pending_members_count,
                'cover_url' => $group->cover_path ? Storage::disk('public')->url($group->cover_path) : null,
            ]);

        return Inertia::render('Groups/Index', [
            'groups' => $groups,
            'managedGroups' => $managedGroups,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'tab' => $tab,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'privacy' => ['required', Rule::in(['public', 'private'])],
        ]);
        $user = $request->user();

        $group = DB::transaction(function () use ($validated, $user): Group {
            $group = Group::query()->create([
                ...$validated,
                'owner_id' => $user->id,
            ]);
            $group->memberships()->create([
                'user_id' => $user->id,
                'role' => 'admin',
                'status' => 'approved',
            ]);

            return $group;
        });

        return to_route('groups.show', $group);
    }

    public function show(Request $request, Group $group): Response
    {
        $user = $request->user();
        $membership = $group->memberships()->where('user_id', $user->id)->first();
        $isMember = $membership?->status === 'approved';
        $isInvited = $membership?->status === 'invited';
        $isAdmin = $isMember && $membership?->role === 'admin';

        abort_if($group->privacy === 'private' && ! $isMember && ! $isInvited, 404);

        $posts = $isMember
            ? $group->posts()
                ->with([
                    'user.profile',
                    'comments' => fn ($query) => $query->with('user.profile')->latest()->limit(5),
                    'reactions' => fn ($query) => $query->where('user_id', $user->id),
                ])
                ->withCount(['comments', 'reactions'])
                ->paginate(15)
            : $group->posts()->whereRaw('1 = 0')->paginate(15);

        $posts->getCollection()->each(function (GroupPost $post): void {
            $post->setAttribute(
                'image_url',
                $post->image_path ? Storage::disk('public')->url($post->image_path) : null,
            );
        });
        $members = ($group->privacy === 'public' || $isMember)
            ? ($isAdmin
                ? $group->memberships()->whereIn('status', ['approved', 'suspended'])
                : $group->members())
                ->with('user.profile')
                ->latest()
                ->limit(30)
                ->get()
                ->map(fn (GroupMembership $member): array => [
                    'id' => $member->id,
                    'user_id' => $member->user_id,
                    'name' => $member->user->name,
                    'avatar_url' => $member->user->profile?->avatar_url,
                    'role' => $member->role,
                    'status' => $member->status,
                ])
            : collect();
        $pendingMembers = $isAdmin
            ? $group->memberships()
                ->where('status', 'pending')
                ->with('user.profile')
                ->latest()
                ->get()
                ->map(fn (GroupMembership $member): array => [
                    'id' => $member->id,
                    'user_id' => $member->user_id,
                    'name' => $member->user->name,
                    'avatar_url' => $member->user->profile?->avatar_url,
                ])
                ->values()
            : collect();
        $inviteableFriends = $isAdmin
            ? $this->inviteableFriends($user, $group)
            : collect();
        $openReports = $isAdmin
            ? $group->contentReports()
                ->where('status', 'open')
                ->with(['reporter', 'post.user', 'comment.user', 'comment.groupPost'])
                ->latest()
                ->limit(50)
                ->get()
                ->map(function (GroupContentReport $report): array {
                    $post = $report->post;
                    $comment = $report->comment;
                    $content = $comment?->body ?? $post?->content;

                    return [
                        'id' => $report->id,
                        'reason' => $report->reason,
                        'details' => $report->details,
                        'reporter_name' => $report->reporter?->name ?? 'Former member',
                        'target_type' => $report->target_type,
                        'target_user_name' => $comment?->user?->name ?? $post?->user?->name,
                        'target_content' => filled($content) ? $content : ($post?->image_path ? 'Photo post' : 'Reported content was removed.'),
                        'post_id' => $comment?->groupPost?->id ?? $post?->id,
                        'comment_id' => $comment?->id,
                        'created_at' => $report->created_at,
                    ];
                })
            : collect();

        return Inertia::render('Groups/Show', [
            'group' => [
                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'privacy' => $group->privacy,
                'cover_url' => $group->cover_path ? Storage::disk('public')->url($group->cover_path) : null,
                'owner_id' => $group->owner_id,
                'owner_name' => $group->owner()->value('name'),
                'member_count' => $group->members()->count(),
            ],
            'pendingMemberCount' => $isAdmin
                ? $group->memberships()->where('status', 'pending')->count()
                : 0,
            'membership' => $membership ? [
                'status' => $membership->status,
                'role' => $membership->role,
            ] : null,
            'isMember' => $isMember,
            'isInvited' => $isInvited,
            'isAdmin' => $isAdmin,
            'members' => $members,
            'pendingMembers' => $pendingMembers,
            'inviteableFriends' => $inviteableFriends,
            'openReports' => $openReports,
            'posts' => $posts,
        ]);
    }

    private function inviteableFriends(User $user, Group $group): Collection
    {
        $friendships = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user): void {
                $query->where('requester_id', $user->id)
                    ->orWhere('addressee_id', $user->id);
            })
            ->with(['requester.profile', 'addressee.profile'])
            ->latest()
            ->limit(100)
            ->get();

        $friends = $friendships
            ->map(fn (Friendship $friendship): User => $friendship->requester_id === $user->id
                ? $friendship->addressee
                : $friendship->requester)
            ->unique('id')
            ->values();
        $activeMembershipUserIds = $group->memberships()
            ->whereIn('user_id', $friends->pluck('id'))
            ->whereIn('status', ['approved', 'pending', 'invited', 'suspended'])
            ->pluck('user_id');

        return $friends
            ->reject(fn (User $friend): bool => $activeMembershipUserIds->contains($friend->id))
            ->map(fn (User $friend): array => [
                'id' => $friend->id,
                'name' => $friend->name,
                'avatar_url' => $friend->profile?->avatar_url,
            ]);
    }

    public function join(Request $request, Group $group, NotificationService $notifications): RedirectResponse
    {
        $user = $request->user();
        $status = $group->privacy === 'public' ? 'approved' : 'pending';

        DB::transaction(function () use ($group, $user, $status, $notifications): void {
            $group->newQuery()->whereKey($group->id)->lockForUpdate()->firstOrFail();
            $membership = $group->memberships()->firstOrNew(['user_id' => $user->id]);
            $wasInvited = $membership->exists && $membership->status === 'invited';

            if ($membership->role === 'admin' && $membership->exists) {
                return;
            }

            if ($membership->exists && $membership->status === 'suspended') {
                throw ValidationException::withMessages([
                    'membership' => 'Your membership in this group is suspended.',
                ]);
            }

            $isNewRequest = ! $membership->exists || in_array($membership->status, ['rejected', 'left'], true);
            if ($isNewRequest || $wasInvited) {
                $membership->status = $wasInvited ? 'approved' : $status;
                $membership->role = 'member';
                $membership->save();
            }

            if ($status === 'pending' && $isNewRequest) {
                $admins = $group->memberships()
                    ->where('role', 'admin')
                    ->where('status', 'approved')
                    ->with('user')
                    ->get();

                foreach ($admins as $admin) {
                    $notifications->create($admin->user, 'group_join_request', [
                        'group_id' => $group->id,
                        'user_id' => $user->id,
                        'message' => "{$user->name} requested to join {$group->name}.",
                    ]);
                }
            }
        });

        return back();
    }

    public function inviteFriend(Request $request, Group $group, NotificationService $notifications): RedirectResponse
    {
        abort_unless($group->isAdmin($request->user()), 403);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);
        $inviter = $request->user();
        $invitee = User::query()->findOrFail($validated['user_id']);

        if (! $inviter->isFriendWith($invitee)) {
            return back()->withErrors(['user_id' => 'You can only invite a friend to this group.']);
        }

        DB::transaction(function () use ($group, $invitee, $inviter, $notifications): void {
            $group->newQuery()->whereKey($group->id)->lockForUpdate()->firstOrFail();
            $membership = $group->memberships()->firstOrNew(['user_id' => $invitee->id]);

            if ($membership->exists && in_array($membership->status, ['approved', 'pending', 'invited', 'suspended'], true)) {
                throw ValidationException::withMessages([
                    'user_id' => 'This person already belongs to the group or has an active request.',
                ]);
            }

            $membership->role = 'member';
            $membership->status = 'invited';
            $membership->save();

            $notifications->create($invitee, 'group_invite', [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'inviter_name' => $inviter->name,
                'message' => $inviter->name.' invited you to join '.$group->name.'.',
            ]);
        });

        return back();
    }

    public function declineInvitation(Request $request, Group $group): RedirectResponse
    {
        $membership = $group->memberships()
            ->where('user_id', $request->user()->id)
            ->where('status', 'invited')
            ->firstOrFail();
        $membership->update(['status' => 'rejected']);

        return to_route('groups.index', ['tab' => 'your-groups']);
    }

    public function updateCover(Request $request, Group $group): RedirectResponse
    {
        abort_unless($group->isAdmin($request->user()), 403);

        $validated = $request->validate([
            'cover' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:8192'],
        ]);
        $disk = Storage::disk('public');
        $oldPath = $group->cover_path;
        $newPath = $validated['cover']->store('group-covers/'.$group->id, 'public');

        if ($newPath === false) {
            throw new \RuntimeException('The group cover photo could not be stored.');
        }

        try {
            $group->update(['cover_path' => $newPath]);
        } catch (\Throwable $exception) {
            $disk->delete($newPath);

            throw $exception;
        }

        if ($oldPath !== null) {
            $disk->delete($oldPath);
        }

        return back();
    }

    public function leave(Request $request, Group $group): RedirectResponse
    {
        $membership = $group->memberships()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->firstOrFail();

        if ($membership->role === 'admin') {
            return back()->withErrors(['membership' => 'The group owner cannot leave the group.']);
        }

        $membership->update(['status' => 'left']);

        return back();
    }

    public function moderateMember(
        Request $request,
        Group $group,
        GroupMembership $membership,
        NotificationService $notifications,
    ): RedirectResponse {
        abort_unless($group->isAdmin($request->user()), 403);
        abort_unless($membership->group_id === $group->id, 404);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
        ]);

        abort_unless($membership->status === 'pending', 409);

        $membership->update([
            'status' => $validated['action'] === 'approve' ? 'approved' : 'rejected',
        ]);

        if ($validated['action'] === 'approve') {
            $notifications->create($membership->user, 'group_join_approved', [
                'group_id' => $group->id,
                'message' => "Your request to join {$group->name} was approved.",
            ]);
        }

        return back();
    }

    public function removeMember(
        Request $request,
        Group $group,
        GroupMembership $membership,
        NotificationService $notifications,
    ): RedirectResponse {
        abort_unless($group->isAdmin($request->user()), 403);
        abort_unless($membership->group_id === $group->id, 404);
        abort_if($membership->role === 'admin', 403);

        $membership->update(['status' => 'left']);
        $notifications->create($membership->user, 'group_membership_updated', [
            'group_id' => $group->id,
            'message' => "You have been removed from {$group->name}.",
        ]);

        return back();
    }

    public function storePost(Request $request, Group $group): RedirectResponse
    {
        abort_unless($group->isMember($request->user()), 403);

        $validated = $request->validate([
            'content' => ['nullable', 'required_without:image', 'string', 'max:2000'],
            'image' => ['nullable', 'required_without:content', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:8192'],
        ]);

        $imagePath = isset($validated['image'])
            ? $validated['image']->store('group-posts/'.$group->id, 'public')
            : null;

        if (isset($validated['image']) && $imagePath === false) {
            throw new \RuntimeException('The group post image could not be stored.');
        }

        try {
            $group->posts()->create([
                'user_id' => $request->user()->id,
                'content' => $validated['content'] ?? '',
                'image_path' => $imagePath,
            ]);
        } catch (\Throwable $exception) {
            if ($imagePath !== null) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $exception;
        }

        return back();
    }
}
