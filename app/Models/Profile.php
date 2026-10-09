<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = [
        'user_id',
        'username',
        'bio',
        'location',
        'website',
        'avatar_url',
        'cover_url',
        'location_visibility',
        'photos_visibility',
        'friends_visibility',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
