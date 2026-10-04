<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->latest();
    }

    public function userSettings(): HasMany
    {
        return $this->hasMany(ConversationUserSetting::class);
    }

    public function userSettingFor(User $user): ConversationUserSetting
    {
        return $this->userSettings()->firstOrCreate([
            'user_id' => $user->getKey(),
        ], [
            'is_archived' => false,
            'is_muted' => false,
            'is_deleted' => false,
        ]);
    }
}
