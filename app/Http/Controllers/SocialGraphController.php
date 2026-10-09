<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\User;
use App\Services\SocialGraphService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SocialGraphController extends Controller
{
    public function __construct(private readonly SocialGraphService $socialGraph) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $excludedStatuses = ['pending', 'accepted', 'blocked'];
        $followingIds = $user->following()->pluck('users.id');

        $suggestions = User::query()
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', Friendship::query()
                ->select('addressee_id')
                ->where('requester_id', $user->id)
                ->whereIn('status', $excludedStatuses))
            ->whereNotIn('id', Friendship::query()
                ->select('requester_id')
                ->where('addressee_id', $user->id)
                ->whereIn('status', $excludedStatuses))
            ->with('profile')
            ->orderBy('name')
            ->paginate(12, ['*'], 'suggestions_page')
            ->through(fn (User $person): array => [
                'id' => $person->id,
                'name' => $person->name,
                'username' => $person->profile?->username,
                'avatar_url' => $person->profile?->avatar_url,
                'is_following' => $followingIds->contains($person->id),
            ]);

        $incomingRequests = Friendship::query()
            ->where('addressee_id', $user->id)
            ->where('status', 'pending')
            ->with('requester.profile')
            ->latest()
            ->paginate(12, ['*'], 'requests_page')
            ->through(fn (Friendship $friendship): array => [
                'id' => $friendship->requester->id,
                'name' => $friendship->requester->name,
                'username' => $friendship->requester->profile?->username,
                'avatar_url' => $friendship->requester->profile?->avatar_url,
            ]);

        $friends = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user) {
                $query->where('requester_id', $user->id)
                    ->orWhere('addressee_id', $user->id);
            })
            ->with(['requester.profile', 'addressee.profile'])
            ->latest()
            ->paginate(12, ['*'], 'friends_page')
            ->through(function (Friendship $friendship) use ($user): array {
                $friend = $friendship->requester_id === $user->id
                    ? $friendship->addressee
                    : $friendship->requester;

                return [
                    'id' => $friend->id,
                    'name' => $friend->name,
                    'username' => $friend->profile?->username,
                    'avatar_url' => $friend->profile?->avatar_url,
                ];
            });

        $following = $user->following()
            ->with('profile')
            ->orderBy('users.name')
            ->paginate(12, ['users.*'], 'following_page')
            ->through(fn (User $person): array => [
                'id' => $person->id,
                'name' => $person->name,
                'username' => $person->profile?->username,
                'avatar_url' => $person->profile?->avatar_url,
            ]);

        return Inertia::render('Friends/Index', [
            'suggestions' => $suggestions,
            'incomingRequests' => $incomingRequests,
            'friends' => $friends,
            'following' => $following,
        ]);
    }

    public function sendFriendRequest(Request $request, User $user): RedirectResponse
    {
        $this->socialGraph->sendFriendRequest($request->user(), $user);

        return back();
    }

    public function acceptFriendRequest(Request $request, User $user): RedirectResponse
    {
        $this->socialGraph->acceptFriendRequest($request->user(), $user);

        return back();
    }

    public function rejectFriendRequest(Request $request, User $user): RedirectResponse
    {
        $this->socialGraph->rejectFriendRequest($request->user(), $user);

        return back();
    }

    public function cancelFriendRequest(Request $request, User $user): RedirectResponse
    {
        $this->socialGraph->cancelFriendRequest($request->user(), $user);

        return back();
    }

    public function toggleFollow(Request $request, User $user): RedirectResponse
    {
        $this->socialGraph->toggleFollow($request->user(), $user);

        return back();
    }
}
