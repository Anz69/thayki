<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = Auth::guard('admin')->user();

        // Not authenticated → let the auth layer handle it.
        if (! $admin instanceof AdminUser) {
            return $next($request);
        }

        // Two-factor is mandatory: an admin that hasn't linked Telegram yet is
        // forced to the enrollment screen before any panel page is reachable.
        if (! $admin->tg_chat_id) {
            return redirect()->route('admin.2fa.setup');
        }

        $verifiedAt = (int) $request->session()->get('admin_2fa_verified_at', 0);
        $trustTtl = (int) config('admin.twofactor.trust_ttl', 43200);
        if ($verifiedAt > 0 && (now()->timestamp - $verifiedAt) < $trustTtl) {
            return $next($request);
        }

        return redirect()->route('admin.2fa.show');
    }
}
