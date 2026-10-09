<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Group extends Model
{
    protected $fillable = [
        'owner_id',
        'name',
        'description',
        'privacy',
        'cover_path',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class);
    }

    public function members(): HasMany
    {
        return $this->memberships()->where('status', 'approved');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(GroupPost::class)->latest();
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(GroupContentReport::class);
    }

    public function isMember(User $user): bool
    {
        return $this->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->exists();
    }

    public function isAdmin(User $user): bool
    {
        return $this->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('role', 'admin')
            ->exists();
    }
}
