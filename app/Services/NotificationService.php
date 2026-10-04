<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function create(User $user, string $type, array $data = []): Notification
    {
        return Notification::query()->create([
            'id' => (string) str()->uuid(),
            'user_id' => $user->id,
            'type' => $type,
            'data' => $data,
        ]);
    }

    public function unreadCountFor(User $user): int
    {
        return $user->notifications()->whereNull('read_at')->count();
    }
}
