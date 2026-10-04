<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

class PrivacyService
{
    public static function canViewPost(?User $viewer, Post $post): bool
    {
        if ($viewer && $viewer->id === $post->user_id) {
            return true;
        }

        if ($post->visibility === 'public') {
            return true;
        }

        return $viewer !== null
            && $post->visibility === 'friends'
            && $viewer->isFriendWith($post->user);
    }

    public static function scopeVisible(Builder $query, ?User $viewer): Builder
    {
        if ($viewer === null) {
            return $query->where('visibility', 'public');
        }

        $postTable = (new Post)->getTable();

        return $query->where(function (Builder $builder) use ($viewer, $postTable) {
            $builder->where('visibility', 'public')
                ->orWhere($postTable.'.user_id', $viewer->id)
                ->orWhere(function (Builder $friendsOnly) use ($viewer, $postTable) {
                    $friendsOnly->where($postTable.'.visibility', 'friends')
                        ->whereExists(function (QueryBuilder $friendship) use ($viewer, $postTable) {
                            $friendship->selectRaw('1')
                                ->from('friendships')
                                ->where('friendships.status', 'accepted')
                                ->where(function ($pair) use ($viewer, $postTable) {
                                    $pair->where(function ($direction) use ($viewer, $postTable) {
                                        $direction->whereColumn('friendships.requester_id', $postTable.'.user_id')
                                            ->where('friendships.addressee_id', $viewer->id);
                                    })->orWhere(function ($direction) use ($viewer, $postTable) {
                                        $direction->whereColumn('friendships.addressee_id', $postTable.'.user_id')
                                            ->where('friendships.requester_id', $viewer->id);
                                    });
                                });
                        });
                });
        });
    }
}
