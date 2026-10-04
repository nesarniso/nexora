<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->loadMissing('profile'),
            ],
            'unreadMessagesCount' => fn (): int => $request->user()
                ?->receivedMessages()
                ->whereNull('read_at')
                ->whereNull('deleted_at')
                ->whereDoesntHave('hiddenForUsers', fn ($query) => $query
                    ->where('users.id', $request->user()->id))
                ->whereDoesntHave('conversation.userSettings', fn ($query) => $query
                    ->where('user_id', $request->user()->id)
                    ->where('is_archived', true))
                ->count() ?? 0,
            'site' => fn (): array => tap(
                SiteSetting::query()->firstOrFail(),
                fn (SiteSetting $settings) => $settings->setAttribute('logo_url', $settings->logoUrl())
                    ->setAttribute('site_icon_url', $settings->siteIconUrl()),
            )->only(['site_name', 'tagline', 'announcement', 'registration_enabled', 'logo_url', 'site_icon_url']),
        ];
    }
}
