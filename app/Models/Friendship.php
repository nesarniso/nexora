<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Friendship extends Model
{
    protected $fillable = [
        'requester_id',
        'addressee_id',
        'status',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function addressee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'addressee_id');
    }

    public static function blockedBetween(User $first, User $second): bool
    {
        return static::query()
            ->where('status', 'blocked')
            ->where(function ($query) use ($first, $second) {
                $query->where(function ($pair) use ($first, $second) {
                    $pair->where('requester_id', $first->id)
                        ->where('addressee_id', $second->id);
                })->orWhere(function ($pair) use ($first, $second) {
                    $pair->where('requester_id', $second->id)
                        ->where('addressee_id', $first->id);
                });
            })
            ->exists();
    }
}
