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

        // The chat "owner" (help-seeker / lead client) — message sides are aligned
        // around this, not the sender's global role, so a manager who wrote to
        // support is shown on the client side in their own chat.
        if (in_array($chat->type, [ChatType::Lead, ChatType::Support], true)) {
            $meta['owner_id'] = $chat->participants()
                ->whereIn('role', [
                    \App\Enums\ChatParticipantRole::Client->value,
                    \App\Enums\ChatParticipantRole::Model->value,
                ])
                ->value('user_id');
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

        $readerIsStaff = in_array($user->role, [UserRole::Manager, UserRole::Admin, UserRole::Requisite], true);

        // Shared requisites inbox: read state is per participant only. A global
        // messages.read_at would let one manager's read cancel everyone else's notifications.
        if ($chat->type !== ChatType::Requisites) {
            // A read receipt means "the other side read it". In a lead/support chat the
            // two sides are the client (owner) and staff. So a staff member reading must
            // only flip the client's messages — never another manager's — otherwise a
            // manager's message would show "read" when only a colleague opened the chat.
            $ownerId = $chat->participants()
                ->whereIn('role', [
                    \App\Enums\ChatParticipantRole::Client->value,
                    \App\Enums\ChatParticipantRole::Model->value,
                ])
                ->value('user_id');

            $query = Message::query()
                ->where('chat_id', $chat->id)
                ->whereNull('read_at')
                ->where('sender_id', '!=', $user->id);

            if ($ownerId !== null) {
                if ((int) $user->id === (int) $ownerId) {
                    // Client read → flip staff (non-owner) messages.
                    $query->where('sender_id', '!=', $ownerId);
                } else {
                    // Staff read → flip only the client's messages.
                    $query->where('sender_id', $ownerId);
                }
            }

            $query->update(['read_at' => $now]);
        }

        try {
            event(new MessagesRead($chat->id, $user->id, $now->toIso8601String(), $readerIsStaff));
        } catch (\Throwable) {}

        return ApiResponse::noContent();
    }

    public function selectModel(Request $request, Chat $chat, PostMessageAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $this->canAccessChat($user, $chat)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }
        if ($chat->type !== ChatType::Lead) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Model selection is only available in lead chats.');
        }

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'model_id' => ['nullable', 'integer'],
            'photo' => ['nullable', 'string', 'max:1000'],
        ]);

        $message = $action->execute(
            $user,
            $chat,
            null,
            null,
            null,
            'model_selected',
            [
                'name' => $data['name'] ?? null,
                'model_id' => $data['model_id'] ?? null,
                'photo' => $data['photo'] ?? null,
            ],
        );

        // Typed cards are skipped by the generic message-notification job, so push
        // the manager(s) explicitly — they must be told even when not in the chat.
        try {
            $lead = Lead::query()->where('chat_id', $chat->id)->first();
            if ($lead !== null) {
                $notifier = \App\Services\Telegram\Notifier::default();
                $name = trim((string) ($data['name'] ?? ''));
                $managers = User::query()
                    ->where('role', UserRole::Manager->value)
                    ->whereNotNull('tg_chat_id')
                    ->where('notifications_enabled', true)
                    ->when($lead->manager_id, fn ($q) => $q->where('id', $lead->manager_id))
                    ->get();

                foreach ($managers as $manager) {
                    if ((int) $manager->id === (int) $user->id) {
                        continue;
                    }
                    $code = strtolower((string) ($manager->language_code ?? ''));
                    $locale = str_starts_with($code, 'zh') ? 'zh' : (str_starts_with($code, 'en') ? 'en' : 'ru');
                    $notifier->notifyUser(
                        $manager,
                        trans('notifications.model_selected', ['id' => $lead->id, 'name' => e($name)], $locale),
                        "/request/chat?id={$chat->id}&lead={$lead->id}&from=".rawurlencode('/manager/leads'),
                        trans('notifications.open_chat', [], $locale),
                        'model-selected:'.$message->id.':m'.$manager->id,
                    );
                }
            }
        } catch (\Throwable) {
        }

        return ApiResponse::created(new MessageResource($message->load('sender')));
    }

    public function deleteMessage(Request $request, Chat $chat, Message $message): JsonResponse
    {
        $user = $request->user();
        if (! $this->canAccessChat($user, $chat)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }
        if ($message->chat_id !== $chat->id) {
            throw DomainException::forbidden('MESSAGE_FORBIDDEN', 'Message does not belong to this chat.');
        }

        $isStaff = in_array($user->role, [UserRole::Manager, UserRole::Admin], true);
        if (! $isStaff && $message->sender_id !== $user->id) {
            throw DomainException::forbidden('MESSAGE_FORBIDDEN', 'You can only delete your own messages.');
        }

        $messageId = $message->id;

        if ($message->attachment_path !== null && $message->attachment_disk !== null) {
            try {
                \Illuminate\Support\Facades\Storage::disk($message->attachment_disk)->delete($message->attachment_path);
            } catch (\Throwable) {
            }
        }

        $message->delete();

        $last = Message::query()->where('chat_id', $chat->id)->latest('id')->first();
        $chat->forceFill(['last_message_at' => $last?->created_at])->save();

        try {
            event(new \App\Events\MessageDeleted($chat->id, $messageId));
        } catch (\Throwable) {
        }

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
