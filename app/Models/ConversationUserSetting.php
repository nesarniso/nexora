<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConversationUserSetting extends Model
{
    protected $fillable = [
        'conversation_id',
        'user_id',
        'is_archived',
        'is_muted',
        'is_deleted',
    ];

    protected $casts = [
        'is_archived' => 'boolean',
        'is_muted' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function forUser(User $user, Conversation $conversation): self
    {
        return static::query()->firstOrCreate([
            'conversation_id' => $conversation->getKey(),
            'user_id' => $user->getKey(),
        ], [
            'is_archived' => false,
            'is_muted' => false,
            'is_deleted' => false,
        ]);
    }
}
