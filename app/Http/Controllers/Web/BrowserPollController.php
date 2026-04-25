<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

/**
 * Handles browser tab polling after the user authenticated the Mini App
 * via a deep-link that contained a browser_token.
 *
 * Flow:
 *   1. LoginPage generates a UUID, appends it to the Telegram deep-link.
 *   2. Mini App authenticates and stores {browser_token → user_id} in cache.
 *   3. Browser polls GET /auth/browser-poll/{token} every ~2 s.
 *   4. This endpoint finds the cached user_id, creates a session and returns
 *      the user so the SPA can update its store and redirect.
 */
class BrowserPollController extends Controller
{
    public function poll(Request $request, string $token): JsonResponse
    {
        // Ignore obviously invalid tokens
        if (strlen($token) < 8 || strlen($token) > 128) {
            return response()->json(['authenticated' => false]);
        }

        $userId = Cache::get('browser_auth:' . $token);

        if (! $userId) {
            return response()->json(['authenticated' => false]);
        }

        /** @var User|null $user */
        $user = User::find($userId);

        if (! $user) {
            Cache::forget('browser_auth:' . $token);
            return response()->json(['authenticated' => false]);
        }

        // Consume the token — one-time use
        Cache::forget('browser_auth:' . $token);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return response()->json([
            'authenticated' => true,
            'user'          => [
                'id'         => $user->id,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'username'   => $user->username,
                'photo_url'  => $user->photo_url,
                'role'       => $user->role->value,
                'is_premium' => $user->is_premium,
            ],
        ]);
    }
}
