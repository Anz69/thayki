<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class BrowserPollController extends Controller
{
    public function poll(Request $request, string $token): JsonResponse
    {
        if (strlen($token) < 8 || strlen($token) > 128) {
            return response()->json(['authenticated' => false]);
        }

        $userId = Cache::get('browser_auth:' . $token);

        if (! $userId) {
            return response()->json(['authenticated' => false]);
        }

        $user = User::find($userId);

        if (! $user) {
            Cache::forget('browser_auth:' . $token);
            return response()->json(['authenticated' => false]);
        }

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
