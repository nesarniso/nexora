<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GroupPost extends Model
{
    protected $fillable = [
        'group_id',
        'user_id',
        'content',
        'image_path',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(GroupPostComment::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(GroupPostReaction::class);
    }
}
