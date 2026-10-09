<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupContentReport extends Model
{
    protected $fillable = [
        'group_id',
        'reporter_id',
        'group_post_id',
        'group_post_comment_id',
        'target_type',
        'reason',
        'details',
        'status',
        'reviewed_by_id',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(GroupPost::class, 'group_post_id');
    }

    public function comment(): BelongsTo
    {
        return $this->belongsTo(GroupPostComment::class, 'group_post_comment_id');
    }
}
