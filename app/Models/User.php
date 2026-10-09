<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class)->latest();
    }

    public function savedPosts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'saved_posts')->withTimestamps();
    }

    public function stories(): HasMany
    {
        return $this->hasMany(Story::class);
    }

    public function groupMemberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class);
    }

    public function groupPosts(): HasMany
    {
        return $this->hasMany(GroupPost::class)->latest();
    }

    public function mediaAssets(): HasMany
    {
        return $this->hasMany(MediaAsset::class)->latest();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class)->latest();
    }

    public function sentFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'requester_id');
    }

    public function receivedFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'addressee_id');
    }

    public function friendships(): HasMany
    {
        return $this->hasMany(Friendship::class, 'requester_id')
            ->orWhere('addressee_id', $this->id);
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'follower_id', 'followee_id');
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'followee_id', 'follower_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_one_id')
            ->orWhere('user_two_id', $this->id);
    }

    public function conversationSettings(): HasMany
    {
        return $this->hasMany(ConversationUserSetting::class);
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'recipient_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest();
    }

    public function friendshipWith(self $user): ?Friendship
    {
        return Friendship::query()
            ->where(function ($query) use ($user) {
                $query->where('requester_id', $this->id)
                    ->where('addressee_id', $user->id);
            })
            ->orWhere(function ($query) use ($user) {
                $query->where('requester_id', $user->id)
                    ->where('addressee_id', $this->id);
            })
            ->first();
    }

    public function isFriendWith(self $user): bool
    {
        return Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user) {
                $query->where(function ($pair) use ($user) {
                    $pair->where('requester_id', $this->id)
                        ->where('addressee_id', $user->id);
                })->orWhere(function ($pair) use ($user) {
                    $pair->where('requester_id', $user->id)
                        ->where('addressee_id', $this->id);
                });
            })
            ->exists();
    }

    public function isFollowing(self $user): bool
    {
        return $this->following()->whereKey($user->getKey())->exists();
    }

    public function follow(self $user): bool
    {
        if ($this->is($user)) {
            return false;
        }

        $this->following()->syncWithoutDetaching([$user->id]);

        return true;
    }

    public function unfollow(self $user): bool
    {
        if ($this->is($user)) {
            return false;
        }

        $this->following()->detach($user->id);

        return true;
    }

    protected static function booted(): void
    {
        static::created(function (self $user): void {
            if (! $user->profile()->exists()) {
                $base = Str::slug($user->name) ?: 'user';
                $username = $base;
                $counter = 2;

                while (self::whereHas('profile', fn ($query) => $query->where('username', $username))->exists()) {
                    $username = $base.'-'.$counter;
                    $counter++;
                }

                $user->profile()->create([
                    'username' => $username,
                ]);
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_admin' => 'boolean',
            'is_suspended' => 'boolean',
            'password' => 'hashed',
        ];
    }
}
