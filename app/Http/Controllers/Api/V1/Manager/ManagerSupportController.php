<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ManagerSupportController extends Controller
{

    public function index(): JsonResponse
    {
        $chats = Chat::query()
            ->where('type', ChatType::Support)
            ->with(['participants.user', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->get();

        $chatIds = $chats->pluck('id')->all();

        $unread = [];
        if ($chatIds !== []) {
            $rows = DB::table('messages as m')
                ->leftJoin('users as u', 'u.id', '=', 'm.sender_id')
                ->whereIn('m.chat_id', $chatIds)
                ->whereNull('m.read_at')
                ->whereNotIn('u.role', [UserRole::Admin->value, UserRole::Manager->value])
                ->groupBy('m.chat_id')
                ->selectRaw('m.chat_id as chat_id, COUNT(*) as c')
                ->get();
            foreach ($rows as $r) {
                $unread[(int) $r->chat_id] = (int) $r->c;
            }
        }

        return ApiResponse::ok($chats->map(function (Chat $chat) use ($unread) {
            $participant = $chat->participants
                ->first(fn ($p) => ! in_array($p->user?->role, [UserRole::Admin, UserRole::Manager], true));
            $user = $participant?->user;
            $last = $chat->lastMessage;

            $awaiting = $last !== null
                && ! in_array($last->sender?->role, [UserRole::Admin, UserRole::Manager], true);

            return [
                'chat_id' => $chat->id,
                'client' => $user ? [
                    'name' => trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: ($user->username ?? '—'),
                    'username' => $user->username,
                    'photo' => $user->photo_url,
                ] : null,
                'last_message' => $last ? [
                    'preview' => $this->preview($last),
                    'at' => $last->created_at?->toIso8601String(),
                ] : null,
                'unread' => $unread[$chat->id] ?? 0,
                'awaiting' => $awaiting,
            ];
        })->values());
    }

    private function preview(Message $m): string
    {
        if ($m->type === 'image' || $m->attachment_path) {
            return '📷';
        }
        $body = trim((string) $m->body);

        return $body !== '' ? mb_substr($body, 0, 80) : '…';
    }
}
