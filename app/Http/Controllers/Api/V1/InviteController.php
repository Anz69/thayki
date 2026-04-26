<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\StartInvite;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lets a *verified* (non-strange) user mint a single-use deep-link they can
 * forward to a friend. The friend, on tapping it, runs through the bot's
 * /start flow and gets flipped to non-strange themselves (see StartHandler).
 *
 * Strange users are blocked outright — you cannot bootstrap verification by
 * inviting yourself.
 */
class InviteController extends Controller
{
    public function share(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->is_strange) {
            throw DomainException::forbidden('INVITE_FORBIDDEN', 'Strange users cannot create invites.');
        }

        // 24 raw bytes → 32-char URL-safe base64. Far above brute-force range
        // and short enough to fit comfortably in a t.me ?start= parameter.
        $token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');

        // Deliberately scoped: 1 use, 7-day expiry. Keeps a leaked link from
        // becoming a long-lived back door.
        StartInvite::query()->create([
            'token'              => $token,
            'kind'               => StartInvite::KIND_VERIFY,
            'label'              => "Поделиться от user #{$user->id}",
            'created_by_user_id' => $user->id,
            'max_uses'           => 1,
            'expires_at'         => now()->addDays(7),
        ]);

        $bot = (string) config('telegram.bot_username', '');
        $url = $bot !== ''
            ? "https://t.me/{$bot}?start={$token}"
            : null;

        return ApiResponse::created([
            'token' => $token,
            'url'   => $url,
            'expires_at' => now()->addDays(7)->toIso8601String(),
        ]);
    }
}
