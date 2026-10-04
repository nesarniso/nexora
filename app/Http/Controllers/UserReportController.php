<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserReportController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->id !== $user->id, 404);

        $validated = $request->validate([
            'reason' => ['required', Rule::in(['spam', 'harassment', 'impersonation', 'other'])],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        UserReport::query()->create([
            'reporter_id' => $request->user()->id,
            'reported_user_id' => $user->id,
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]);

        return back()->with('success', 'Your report has been submitted for review.');
    }
}
