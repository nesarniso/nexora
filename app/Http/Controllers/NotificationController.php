<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): Response
    {
        $notifications = $request->user()->notifications()->latest()->get();

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'unreadCount' => $this->notifications->unreadCountFor($request->user()),
        ]);
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->notifications()->whereNull('read_at')->update([
            'read_at' => now(),
        ]);

        return Redirect::back();
    }
}
