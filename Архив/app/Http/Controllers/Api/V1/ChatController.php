<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Chat\EnsureMeetingChatAction;
use App\Actions\Chat\EnsureSupportChatAction;
use App\Actions\Chat\PostMessageAction;
use App\Enums\UserRole;
use App\Events\MessagesRead;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\PostMessageRequest;
use App\Http\Resources\ChatResource;
use App\Http\Resources\MessageResource;
use App\Models\Chat;
use App\Models\Meeting;
use App\Models\Message;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $chats = Chat::query()
            ->with(['participants.user', 'lastMessage'])
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->orderByDesc('last_message_at')
            ->limit(50)
            ->get();

        return ApiResponse::ok(ChatResource::collection($chats)->resolve());
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

        $chat = $action->execute($meeting)->load('participants.user');

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
        if (! $chat->isParticipant($user) && $user->role !== UserRole::Admin) {
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

        $message = $action->execute(
            $user,
            $chat,
            $request->input('body'),
            $request->file('attachment'),
        );

        return ApiResponse::created(new MessageResource($message->load('sender')));
    }

    public function markRead(Request $request, Chat $chat): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (! $chat->isParticipant($user)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'Not a participant.');
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
