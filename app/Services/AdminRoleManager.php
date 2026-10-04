<?php

namespace App\Services;

use App\Enums\AdminRoleChangeResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminRoleManager
{
    public function setAdminRole(User $user, bool $isAdmin): AdminRoleChangeResult
    {
        return DB::transaction(function () use ($user, $isAdmin): AdminRoleChangeResult {
            $administrators = User::query()
                ->where('is_admin', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($lockedUser->is_admin === $isAdmin) {
                return AdminRoleChangeResult::Unchanged;
            }

            if (! $isAdmin && $administrators->count() <= 1) {
                return AdminRoleChangeResult::LastAdministrator;
            }

            $lockedUser->forceFill(['is_admin' => $isAdmin])->save();

            return AdminRoleChangeResult::Updated;
        });
    }

    public function setSuspended(User $user, bool $isSuspended): AdminRoleChangeResult
    {
        return DB::transaction(function () use ($user, $isSuspended): AdminRoleChangeResult {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($lockedUser->is_suspended === $isSuspended) {
                return AdminRoleChangeResult::Unchanged;
            }

            if ($isSuspended && $lockedUser->is_admin) {
                $activeAdministrators = User::query()
                    ->where('is_admin', true)
                    ->where('is_suspended', false)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->count();

                if ($activeAdministrators <= 1) {
                    return AdminRoleChangeResult::LastActiveAdministrator;
                }
            }

            $lockedUser->forceFill(['is_suspended' => $isSuspended])->save();

            return AdminRoleChangeResult::Updated;
        });
    }
}
