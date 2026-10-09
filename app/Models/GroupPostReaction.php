<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupPostReaction extends Model
{
    protected $fillable = [
        'group_post_id',
        'user_id',
        'type',
    ];

    public function groupPost(): BelongsTo
    {
        return $this->belongsTo(GroupPost::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
