<?php

namespace App\Services;

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SocialGraphService
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function sendFriendRequest(User $requester, User $addressee): Friendship
    {
        if ($requester->is($addressee)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot send a friend request to yourself.',
            ]);
        }

        return DB::transaction(function () use ($requester, $addressee): Friendship {
            $userIds = collect([$requester->id, $addressee->id])->sort()->values();
            User::query()
                ->whereIn('id', $userIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);

            $friendship = Friendship::query()
                ->where(function ($query) use ($requester, $addressee) {
                    $query->where('requester_id', $requester->id)
                        ->where('addressee_id', $addressee->id);
                })
                ->orWhere(function ($query) use ($requester, $addressee) {
                    $query->where('requester_id', $addressee->id)
                        ->where('addressee_id', $requester->id);
                })
                ->lockForUpdate()
                ->first();

            if ($friendship?->status === 'accepted') {
                return $friendship;
            }

            if ($friendship?->status === 'blocked') {
                throw ValidationException::withMessages([
                    'user' => 'A friend request cannot be sent for this relationship.',
                ]);
            }

            if ($friendship?->status === 'pending') {
                if ($friendship->requester_id === $requester->id) {
                    return $friendship;
                }

                $friendship->update(['status' => 'accepted']);
                $this->notifications->create($addressee, 'friend_request_accepted', [
                    'message' => $requester->name.' accepted your friend request.',
                    'user_id' => $requester->id,
                ]);

                return $friendship;
            }

            if ($friendship) {
                $friendship->update([
                    'requester_id' => $requester->id,
                    'addressee_id' => $addressee->id,
                    'status' => 'pending',
                ]);
            } else {
                $friendship = Friendship::query()->create([
                    'requester_id' => $requester->id,
                    'addressee_id' => $addressee->id,
                    'status' => 'pending',
                ]);
            }

            $this->notifications->create($addressee, 'friend_request_received', [
                'message' => $requester->name.' sent you a friend request.',
                'user_id' => $requester->id,
            ]);

            return $friendship;
        });
    }

    public function acceptFriendRequest(User $user, User $requester): Friendship
    {
        return DB::transaction(function () use ($user, $requester): Friendship {
            $friendship = Friendship::query()
                ->where('requester_id', $requester->id)
                ->where('addressee_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $friendship || $friendship->status !== 'pending') {
                throw ValidationException::withMessages([
                    'friend_request' => 'This incoming friend request is no longer available.',
                ]);
            }

            $friendship->update(['status' => 'accepted']);
            $this->notifications->create($requester, 'friend_request_accepted', [
                'message' => $user->name.' accepted your friend request.',
                'user_id' => $user->id,
            ]);

            return $friendship;
        });
    }

    public function rejectFriendRequest(User $user, User $requester): Friendship
    {
        return DB::transaction(function () use ($user, $requester): Friendship {
            $friendship = Friendship::query()
                ->where('requester_id', $requester->id)
                ->where('addressee_id', $user->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $friendship) {
                throw ValidationException::withMessages([
                    'friend_request' => 'This incoming friend request is no longer available.',
                ]);
            }

            $friendship->update(['status' => 'rejected']);

            return $friendship;
        });
    }

    public function cancelFriendRequest(User $requester, User $addressee): Friendship
    {
        return DB::transaction(function () use ($requester, $addressee): Friendship {
            $friendship = Friendship::query()
                ->where('requester_id', $requester->id)
                ->where('addressee_id', $addressee->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if (! $friendship) {
                throw ValidationException::withMessages([
                    'friend_request' => 'This friend request is no longer available.',
                ]);
            }

            $friendship->update(['status' => 'rejected']);

            return $friendship;
        });
    }

    public function toggleBlock(User $blocker, User $blocked): bool
    {
        if ($blocker->is($blocked)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot block yourself.',
            ]);
        }

        return DB::transaction(function () use ($blocker, $blocked): bool {
            $userIds = collect([$blocker->id, $blocked->id])->sort()->values();
            User::query()
                ->whereIn('id', $userIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);

            $friendships = Friendship::query()
                ->where(function ($query) use ($blocker, $blocked) {
                    $query->where('requester_id', $blocker->id)
                        ->where('addressee_id', $blocked->id);
                })
                ->orWhere(function ($query) use ($blocker, $blocked) {
                    $query->where('requester_id', $blocked->id)
                        ->where('addressee_id', $blocker->id);
                })
                ->lockForUpdate()
                ->get();

            $blockedByCurrentUser = $friendships->first(
                fn (Friendship $friendship): bool => $friendship->requester_id === $blocker->id
                    && $friendship->status === 'blocked',
            );

            if ($blockedByCurrentUser) {
                $blockedByCurrentUser->update(['status' => 'rejected']);

                return false;
            }

            $friendship = $friendships->first();
            $friendships->skip(1)->each->delete();

            if ($friendship) {
                $friendship->update([
                    'requester_id' => $blocker->id,
                    'addressee_id' => $blocked->id,
                    'status' => 'blocked',
                ]);
            } else {
                $friendship = Friendship::query()->create([
                    'requester_id' => $blocker->id,
                    'addressee_id' => $blocked->id,
                    'status' => 'blocked',
                ]);
            }

            return true;
        });
    }

    public function toggleFollow(User $follower, User $followee): bool
    {
        if ($follower->is($followee)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot follow yourself.',
            ]);
        }

        return DB::transaction(function () use ($follower, $followee): bool {
            $lockedFollower = User::query()
                ->whereKey($follower->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedFollower->isFollowing($followee)) {
                $lockedFollower->unfollow($followee);

                return false;
            }

            $lockedFollower->follow($followee);
            $this->notifications->create($followee, 'new_follower', [
                'message' => $follower->name.' started following you.',
                'user_id' => $follower->id,
            ]);

            return true;
        });
    }
}
