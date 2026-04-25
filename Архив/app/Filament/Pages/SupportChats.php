<?php

namespace App\Filament\Pages;

use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;

class SupportChats extends Page
{
    protected static ?string $navigationIcon  = 'heroicon-o-chat-bubble-left-right';
    protected static ?string $navigationLabel = 'Чат поддержки';
    protected static ?int    $navigationSort  = 10;

    protected static string $view = 'filament.pages.support-chats';

    public ?int   $selectedChatId = null;
    public string $newMessage     = '';
    public string $search         = '';

    protected $listeners = ['$refresh', 'new-message-received' => '$refresh'];

    public function getTitle(): string|Htmlable
    {
        return 'Чат поддержки';
    }

    public function getChats(): \Illuminate\Support\Collection
    {
        return Chat::query()
            ->where('type', ChatType::Support)
            ->with(['participants.user', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->when($this->search !== '', fn ($q) => $q->whereHas(
                'participants.user',
                fn ($u) => $u->where('first_name', 'like', "%{$this->search}%")
                             ->orWhere('last_name',  'like', "%{$this->search}%")
                             ->orWhere('username',   'like', "%{$this->search}%")
            ))
            ->orderByDesc('last_message_at')
            ->get();
    }

    public function selectChat(int $id): void
    {
        $this->selectedChatId = $id;
        $this->newMessage     = '';
    }

    public function getSelectedChat(): ?Chat
    {
        if (! $this->selectedChatId) {
            return null;
        }

        return Chat::with(['participants.user'])->find($this->selectedChatId);
    }

    public function getMessages(): \Illuminate\Support\Collection
    {
        if (! $this->selectedChatId) {
            return collect();
        }

        return Message::query()
            ->where('chat_id', $this->selectedChatId)
            ->with('sender')
            ->orderBy('created_at')
            ->get();
    }

    private function getSupportUser(): User
    {
        return User::firstOrCreate(
            ['telegram_id' => 0],
            [
                'first_name' => 'Поддержка',
                'username'   => 'support',
                'role'       => UserRole::Admin,
                'status'     => UserStatus::Active,
                'is_premium' => false,
            ],
        );
    }

    public function sendReply(): void
    {
        $msg = trim($this->newMessage);
        if ($msg === '' || ! $this->selectedChatId) {
            return;
        }

        $supportUser = $this->getSupportUser();
        $chat        = Chat::with('participants')->findOrFail($this->selectedChatId);

        if (! $chat->participants()->where('user_id', $supportUser->id)->exists()) {
            $chat->participants()->create([
                'user_id' => $supportUser->id,
                'role'    => ChatParticipantRole::Support,
            ]);
        }

        app(PostMessageAction::class)->execute($supportUser, $chat, $msg);

        $this->newMessage = '';
    }
}
