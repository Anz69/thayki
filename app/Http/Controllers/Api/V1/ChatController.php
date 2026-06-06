<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Chat\EnsureMeetingChatAction;
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
use App\Models\Meeting;
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
        /** @var User $user */
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

    public function showForMeeting(Request $request, Meeting $meeting, EnsureMeetingChatAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $profile = $user->modelProfile()->first();
        $canAccess = $user->role === UserRole::Admin
            || $meeting->client_id === $user->id
            || ($profile !== null && $profile->id === $meeting->model_profile_id);
        if (! $canAccess) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }

        $chat = $action->execute($meeting)->load(['participants.user', 'meeting']);

        return ApiResponse::ok(new ChatResource($chat));
    }

    public function support(Request $request, EnsureSupportChatAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $chat = $action->execute($user)->load('participants.user');

        return ApiResponse::ok(new ChatResource($chat));
    }

    public function messages(Request $request, Chat $chat): JsonResponse
    {
        /** @var User $user */
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

        return ApiResponse::ok(
            MessageResource::collection($messages->reverse()->values())->resolve(),
            ['cursor' => ['next_before_id' => $next, 'limit' => $limit]],
        );
    }

    public function postMessage(PostMessageRequest $request, Chat $chat, PostMessageAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // A manager replying in a lead/support chat they haven't joined yet
        // becomes a participant so they can post (and receive notifications).
        if (! $chat->isParticipant($user)
            && $user->role === UserRole::Manager
            && in_array($chat->type, [ChatType::Lead, ChatType::Support], true)) {
            $chat->participants()->create([
                'user_id' => $user->id,
                'role' => \App\Enums\ChatParticipantRole::Support,
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

    /**
     * Lead chats track a conversational status: when the client writes it goes
     * back to "in progress"; when the manager writes it becomes "awaiting client".
     */
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

    /** Participants, plus staff (admin always; manager on lead/support chats). */
    private function canAccessChat(User $user, Chat $chat): bool
    {
        if ($chat->isParticipant($user)) {
            return true;
        }
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Manager
            && in_array($chat->type, [ChatType::Lead, ChatType::Support], true);
    }

    public function markRead(Request $request, Chat $chat): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (! $this->canAccessChat($user, $chat)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
        }
        if (! $chat->isParticipant($user)) {
            // Staff viewing a chat they haven't joined — nothing to mark.
            return ApiResponse::noContent();
        }

        $now = now();

        $chat->participants()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $now]);

        Message::query()
            ->where('chat_id', $chat->id)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->update(['read_at' => $now]);

        try {
            event(new MessagesRead($chat->id, $user->id, $now->toIso8601String()));
        } catch (\Throwable) {}

        return ApiResponse::noContent();
    }
}
