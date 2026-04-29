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
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Facades\Log;

class SupportChats extends Page
{
    protected static ?string $navigationIcon  = 'heroicon-o-chat-bubble-left-right';
    protected static ?string $navigationLabel = 'Чат поддержки';
    protected static ?int    $navigationSort  = 10;

    protected static string $view = 'filament.pages.support-chats';

    public ?int   $selectedChatId = null;
    public string $newMessage     = '';
    public string $search         = '';
    public string $activeTab      = 'users';

    protected $listeners = ['$refresh', 'new-message-received' => '$refresh'];

    public function getTitle(): string|Htmlable
    {
        return 'Чат поддержки';
    }

    public function setTab(string $tab): void
    {
        $this->activeTab      = $tab;
        $this->selectedChatId = null;
        $this->newMessage     = '';
    }

    public function getChats(): \Illuminate\Support\Collection
    {
        $role          = $this->activeTab === 'models' ? UserRole::Model : UserRole::Client;
        $supportUserId = User::where('telegram_id', 0)->value('id') ?? 0;

        return Chat::query()
            ->where('type', ChatType::Support)
            ->whereHas('participants.user', fn ($u) => $u->where('role', $role))
            ->with(['participants.user', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->whereNull('read_at')
                ->where('sender_id', '!=', $supportUserId),
            ])
            ->when($this->search !== '', fn ($q) => $q->whereHas(
                'participants.user',
                fn ($u) => $u->where('first_name', 'like', "%{$this->search}%")
                             ->orWhere('last_name',  'like', "%{$this->search}%")
                             ->orWhere('username',   'like', "%{$this->search}%")
            ))
            ->orderByDesc('last_message_at')
            ->get();
    }

    public function getUnreadCounts(): array
    {
        $supportUserId = User::where('telegram_id', 0)->value('id') ?? 0;

        $countForRole = function (UserRole $role) use ($supportUserId): int {
            return Message::query()
                ->whereNull('read_at')
                ->where('sender_id', '!=', $supportUserId)
                ->whereHas('chat', fn ($q) => $q
                    ->where('type', ChatType::Support)
                    ->whereHas('participants.user', fn ($u) => $u->where('role', $role))
                )
                ->count();
        };

        return [
            'users'  => $countForRole(UserRole::Client),
            'models' => $countForRole(UserRole::Model),
        ];
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
                'is_strange' => false,
                'notifications_enabled' => false,
            ],
        );
    }

    public function uploadAttachment($fileData): void
    {
        if (! $this->selectedChatId || ! $fileData) {
            return;
        }

        try {
            $tmpPath = tempnam(sys_get_temp_dir(), 'chat_attach_');
            $decoded = base64_decode(preg_replace('/^data:[^;]+;base64,/', '', $fileData['data']));
            file_put_contents($tmpPath, $decoded);

            $mime      = $fileData['mime'] ?? 'image/jpeg';
            $extension = match (true) {
                str_contains($mime, 'png')  => 'png',
                str_contains($mime, 'webp') => 'webp',
                default                     => 'jpg',
            };

            $uploaded = new \Illuminate\Http\UploadedFile(
                $tmpPath,
                'attachment.'.$extension,
                $mime,
                null,
                true,
            );

            $supportUser = $this->getSupportUser();
            $chat        = Chat::with('participants')->find($this->selectedChatId);

            if ($chat === null) {
                Notification::make()->title('Чат не найден.')->danger()->send();
                return;
            }

            if (! $chat->participants()->where('user_id', $supportUser->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $supportUser->id,
                    'role'    => ChatParticipantRole::Support,
                ]);
                $chat->load('participants');
            }

            app(PostMessageAction::class)->execute($supportUser, $chat, null, $uploaded);

            @unlink($tmpPath);
        } catch (\Throwable $e) {
            Log::error('[SupportChats] uploadAttachment failed', [
                'chat_id' => $this->selectedChatId,
                'error'   => $e->getMessage(),
            ]);
            Notification::make()
                ->title('Не удалось отправить файл.')
                ->body($e->getMessage())
                ->danger()
                ->send();
        }
    }

    public function sendReply(): void
    {
        $msg = trim($this->newMessage);
        if ($msg === '' || ! $this->selectedChatId) {
            return;
        }

        if (mb_strlen($msg) > 4096) {
            Notification::make()
                ->title('Сообщение слишком длинное (макс. 4096 символов).')
                ->danger()
                ->send();
            return;
        }

        try {
            $supportUser = $this->getSupportUser();
            $chat        = Chat::with('participants')->find($this->selectedChatId);

            if ($chat === null) {
                Notification::make()->title('Чат не найден.')->danger()->send();
                $this->selectedChatId = null;
                return;
            }

            if (! $chat->participants()->where('user_id', $supportUser->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $supportUser->id,
                    'role'    => ChatParticipantRole::Support,
                ]);
                $chat->load('participants');
            }

            app(PostMessageAction::class)->execute($supportUser, $chat, $msg);

            $this->newMessage = '';
        } catch (\Throwable $e) {
            Log::error('[SupportChats] sendReply failed', [
                'chat_id' => $this->selectedChatId,
                'error'   => $e->getMessage(),
            ]);
            Notification::make()
                ->title('Не удалось отправить сообщение.')
                ->body($e->getMessage())
                ->danger()
                ->send();
        }
    }
}
