<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRegistrationIsEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(SiteSetting::query()->value('registration_enabled'), 404);

        return $next($request);
    }
}
