<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Chat\EnsureRequisitesChatAction;
use App\Actions\Chat\EnsureSupportChatAction;
use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatType;
use App\Enums\LeadStatus;
use App\Enums\UserRole;
use App\Events\MessagesRead;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\PostMessageRequest;
use App\Http\Resources\ChatResource;
use App\Http\Resources\MessageResource;
use App\Models\Chat;
use App\Models\Lead;
use App\Models\Message;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {

        $user = $request->user();

        $perPage = min(100, max(1, (int) $request->input('per_page', 50)));
        $page = max(1, (int) $request->input('page', 1));

        $paginator = Chat::query()
            ->with(['participants.user', 'lastMessage'])
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->orderByDesc('last_message_at')
            ->paginate(perPage: $perPage, page: $page);

        $chatIds = $paginator->getCollection()->pluck('id')->all();
        $unreadByChat = [];

        if ($chatIds !== []) {
            $rows = DB::table('messages as m')
                ->leftJoin('chat_participants as cp', function ($join) use ($user) {
                    $join->on('cp.chat_id', '=', 'm.chat_id')
                        ->where('cp.user_id', '=', $user->id);
                })
                ->whereIn('m.chat_id', $chatIds)
                ->where('m.sender_id', '!=', $user->id)
                ->where(function ($q) {
                    $q->whereNull('cp.last_read_at')
                        ->orWhereColumn('m.created_at', '>', 'cp.last_read_at');
                })
                ->groupBy('m.chat_id')
                ->selectRaw('m.chat_id as chat_id, COUNT(*) as c')
                ->get();
            foreach ($rows as $row) {
                $unreadByChat[(int) $row->chat_id] = (int) $row->c;
            }
        }

        foreach ($paginator->getCollection() as $chat) {
            $chat->setAttribute('unread_count_precomputed', $unreadByChat[(int) $chat->id] ?? 0);
        }

        return ApiResponse::ok(
            ChatResource::collection($paginator->getCollection())->resolve(),
            [
                'pagination' => [
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        );
    }

    public function support(Request $request, EnsureSupportChatAction $action): JsonResponse
    {

        $user = $request->user();

        $chat = $action->execute($user)->load('participants.user');

        return ApiResponse::ok(new ChatResource($chat));
    }

    public function requisites(Request $request, EnsureRequisitesChatAction $action): JsonResponse
    {
        $user = $request->user();

        $chat = $action->execute($user)->load('participants.user');

        return ApiResponse::ok(new ChatResource($chat));
    }

    public function messages(Request $request, Chat $chat): JsonResponse
    {

        $user = $request->user();
        if (! $this->canAccessChat($user, $chat)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }

        $limit = min(100, max(1, (int) $request->input('limit', 30)));
        $beforeId = $request->input('before_id');

        $query = Message::query()->where('chat_id', $chat->id)->with('sender')->orderByDesc('id');
        if ($beforeId !== null) {
            $query->where('id', '<', (int) $beforeId);
        }

        $messages = $query->limit($limit)->get();
        $next = $messages->last()?->id;

        $meta = ['cursor' => ['next_before_id' => $next, 'limit' => $limit], 'chat' => ['type' => $chat->type->value]];

        if ($chat->type === ChatType::Lead) {
            $lead = Lead::query()->where('chat_id', $chat->id)->first();
            if ($lead !== null) {
                $meta['lead'] = [
                    'id' => $lead->id,
                    'status' => $lead->status->value,
                    'closed' => in_array($lead->status, [LeadStatus::Closed, LeadStatus::Completed], true),
                ];
            }
        }

        if ($chat->type === ChatType::Support
            && in_array($user->role, [UserRole::Manager, UserRole::Admin], true)) {
            $meta['chat']['title'] = $this->supportChatClientName($chat);
        }

        if ($chat->type === ChatType::Requisites) {
            $this->ensureRequisitesParticipant($chat, $user);
            $meta['participants_read'] = $chat->participants()
                ->get(['user_id', 'last_read_at'])
                ->map(fn ($p) => [
                    'user_id'      => $p->user_id,
                    'last_read_at' => $p->last_read_at?->toIso8601String(),
                ])
                ->values()
                ->all();
        }

        return ApiResponse::ok(
            MessageResource::collection($messages->reverse()->values())->resolve(),
            $meta,
        );
    }

    public function postMessage(PostMessageRequest $request, Chat $chat, PostMessageAction $action): JsonResponse
    {

        $user = $request->user();

        if ($chat->type === ChatType::Lead) {
            $leadStatus = Lead::query()->where('chat_id', $chat->id)->value('status');
            if (in_array($leadStatus, [LeadStatus::Closed->value, LeadStatus::Completed->value], true)) {
                throw DomainException::forbidden('LEAD_CLOSED', 'Заявка закрыта — переписка недоступна.');
            }
        }

        if (! $chat->isParticipant($user) && $user->role === UserRole::Manager
            && in_array($chat->type, [ChatType::Lead, ChatType::Support], true)) {
            // Any manager may join and reply in any lead/support chat (collaboration).
            $chat->participants()->create([
                'user_id' => $user->id,
                'role' => \App\Enums\ChatParticipantRole::Support,
            ]);
            $chat->load('participants');
        }

        if (! $chat->isParticipant($user)
            && $chat->type === ChatType::Requisites
            && in_array($user->role, [UserRole::Requisite, UserRole::Manager, UserRole::Admin], true)) {
            $chat->participants()->create([
                'user_id' => $user->id,
                'role' => $user->role === UserRole::Requisite
                    ? \App\Enums\ChatParticipantRole::Requisites
                    : \App\Enums\ChatParticipantRole::Support,
            ]);
            $chat->load('participants');
        }

        $message = $action->execute(
            $user,
            $chat,
            $request->input('body'),
            $request->file('attachment'),
            $request->input('client_message_id'),
        );

        $this->advanceLeadStatus($chat, $user);

        return ApiResponse::created(new MessageResource($message->load('sender')));
    }

    private function advanceLeadStatus(Chat $chat, User $sender): void
    {
        if ($chat->type !== ChatType::Lead) {
            return;
        }

        $lead = Lead::query()->where('chat_id', $chat->id)->first();
        if ($lead === null) {
            return;
        }

        $fromClient = $lead->user_id === $sender->id;

        if ($fromClient) {
            if ($lead->status === LeadStatus::AwaitingClient) {
                $lead->update(['status' => LeadStatus::InProgress]);
            }
        } elseif (in_array($lead->status, [LeadStatus::New, LeadStatus::InProgress], true)) {
            $lead->update(['status' => LeadStatus::AwaitingClient]);
        }
    }

    private function canAccessChat(User $user, Chat $chat): bool
    {
        if ($chat->isParticipant($user)) {
            return true;
        }
        if ($user->role === UserRole::Admin) {
            return true;
        }

        // The shared requisites chat is open to managers, admins and requisites staff.
        if ($chat->type === ChatType::Requisites
            && in_array($user->role, [UserRole::Manager, UserRole::Admin, UserRole::Requisite], true)) {
            return true;
        }

        return $user->role === UserRole::Manager
            && in_array($chat->type, [ChatType::Lead, ChatType::Support], true);
    }

    public function markRead(Request $request, Chat $chat): JsonResponse
    {

        $user = $request->user();
        if (! $this->canAccessChat($user, $chat)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }

        $now = now();

        $this->ensureRequisitesParticipant($chat, $user);

        $chat->participants()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $now]);

        // Shared requisites inbox: read state is per participant only. A global
        // messages.read_at would let one manager's read cancel everyone else's notifications.
        if ($chat->type !== ChatType::Requisites) {
            Message::query()
                ->where('chat_id', $chat->id)
                ->whereNull('read_at')
                ->where('sender_id', '!=', $user->id)
                ->update(['read_at' => $now]);
        }

        try {
            event(new MessagesRead($chat->id, $user->id, $now->toIso8601String()));
        } catch (\Throwable) {}

        return ApiResponse::noContent();
    }

    private function ensureRequisitesParticipant(Chat $chat, User $user): void
    {
        if ($chat->type !== ChatType::Requisites || $chat->isParticipant($user)) {
            return;
        }

        if (! in_array($user->role, [UserRole::Requisite, UserRole::Manager, UserRole::Admin], true)) {
            return;
        }

        $chat->participants()->create([
            'user_id' => $user->id,
            'role' => $user->role === UserRole::Requisite
                ? \App\Enums\ChatParticipantRole::Requisites
                : \App\Enums\ChatParticipantRole::Support,
        ]);
    }

    private function supportChatClientName(Chat $chat): string
    {
        $chat->loadMissing('participants.user');
        $participant = $chat->participants->first(
            fn ($p) => ! in_array($p->user?->role, [UserRole::Admin, UserRole::Manager], true)
        );
        $user = $participant?->user;
        if ($user === null) {
            return '—';
        }

        return trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: ($user->username ?? '—');
    }
}
