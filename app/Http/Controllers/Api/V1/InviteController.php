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

class InviteController extends Controller
{
    public function share(Request $request): JsonResponse
    {

        $user = $request->user();

        if ($user->is_strange) {
            throw DomainException::forbidden('INVITE_FORBIDDEN', 'Strange users cannot create invites.');
        }

        $token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');

        $expiresAt = now()->addDays(30);

        StartInvite::query()->create([
            'token'              => $token,
            'kind'               => StartInvite::KIND_VERIFY,
            'label'              => "Поделиться от user #{$user->id}",
            'created_by_user_id' => $user->id,
            'max_uses'           => 100000,
            'expires_at'         => $expiresAt,
        ]);

        $miniAppUrl = (string) config('telegram.miniapp_url', '');
        $bot        = (string) config('telegram.bot_username', '');

        if ($miniAppUrl !== '' && str_starts_with($miniAppUrl, 'https://t.me/')) {
            $url = rtrim($miniAppUrl, '/').'?startapp='.$token;
        } elseif ($bot !== '') {
            $url = "https://t.me/{$bot}?start={$token}";
        } else {
            throw DomainException::invalid('BOT_NOT_CONFIGURED', 'Бот не настроен. Обратитесь к администратору.');
        }

        return ApiResponse::created([
            'token' => $token,
            'url'   => $url,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }
}
