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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManagerSupportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $page = max(1, (int) $request->input('page', 1));
        $tab = $request->input('tab') === 'unanswered' ? 'unanswered' : 'all';
        $q = trim((string) $request->input('q', ''));

        $staff = [UserRole::Admin->value, UserRole::Manager->value];

        // "Awaiting" = the chat's latest message was sent by the client (not staff).
        $lastFromClient = fn ($query) => $query->whereExists(function ($sub) use ($staff) {
            $sub->from('messages as lm')
                ->join('users as lu', 'lu.id', '=', 'lm.sender_id')
                ->whereColumn('lm.chat_id', 'chats.id')
                ->whereRaw('lm.id = (select max(m2.id) from messages m2 where m2.chat_id = chats.id)')
                ->whereNotIn('lu.role', $staff);
        });

        $base = Chat::query()
            ->where('type', ChatType::Support)
            ->when($tab === 'unanswered', $lastFromClient)
            ->when($q !== '', function ($query) use ($q, $staff) {
                $query->where(function ($w) use ($q, $staff) {
                    $w->whereHas('participants.user', function ($u) use ($q, $staff) {
                        $u->whereNotIn('role', $staff)
                            ->where(function ($n) use ($q) {
                                $n->where('first_name', 'like', "%{$q}%")
                                    ->orWhere('last_name', 'like', "%{$q}%")
                                    ->orWhere('username', 'like', "%{$q}%");
                            });
                    })->orWhereExists(function ($sub) use ($q) {
                        $sub->from('messages as sm')
                            ->whereColumn('sm.chat_id', 'chats.id')
                            ->where('sm.body', 'like', "%{$q}%");
                    });
                });
            });

        $paginator = (clone $base)
            ->with(['participants.user', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->paginate(perPage: $perPage, page: $page);

        $awaitingTotal = $lastFromClient(Chat::query()->where('type', ChatType::Support))->count();

        $chats = $paginator->getCollection();
        $chatIds = $chats->pluck('id')->all();

        $unread = [];
        if ($chatIds !== []) {
            $rows = DB::table('messages as m')
                ->leftJoin('users as u', 'u.id', '=', 'm.sender_id')
                ->whereIn('m.chat_id', $chatIds)
                ->whereNull('m.read_at')
                ->whereNotIn('u.role', $staff)
                ->groupBy('m.chat_id')
                ->selectRaw('m.chat_id as chat_id, COUNT(*) as c')
                ->get();
            foreach ($rows as $r) {
                $unread[(int) $r->chat_id] = (int) $r->c;
            }
        }

        $data = $chats->map(function (Chat $chat) use ($unread) {
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
        })->values();

        return ApiResponse::ok($data, [
            'pagination' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'awaiting_total' => $awaitingTotal,
        ]);
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
