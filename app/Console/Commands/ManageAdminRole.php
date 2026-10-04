<?php

namespace App\Console\Commands;

use App\Enums\AdminRoleChangeResult;
use App\Models\User;
use App\Services\AdminRoleManager;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('admin:role {email : The exact account email} {action=grant : grant or revoke admin access}')]
#[Description('Grant or revoke administrator access for an account')]
class ManageAdminRole extends Command
{
    public function handle(AdminRoleManager $roles): int
    {
        $action = $this->argument('action');

        if (! in_array($action, ['grant', 'revoke'], true)) {
            $this->error('The action must be either "grant" or "revoke".');

            return self::FAILURE;
        }

        $user = User::query()->where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('No account exists with that email address.');

            return self::FAILURE;
        }

        $result = $roles->setAdminRole($user, $action === 'grant');

        if (in_array($result, [AdminRoleChangeResult::LastAdministrator, AdminRoleChangeResult::LastActiveAdministrator], true)) {
            $this->error('At least one administrator must remain.');

            return self::FAILURE;
        }

        if ($result === AdminRoleChangeResult::Unchanged) {
            $this->info('The account already has the requested admin role.');

            return self::SUCCESS;
        }

        $this->info('Admin access '.($action === 'grant' ? 'granted' : 'revoked')." for {$user->email}.");

        return self::SUCCESS;
    }
}
