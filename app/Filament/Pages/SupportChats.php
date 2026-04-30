<?php

namespace App\Filament\Pages;

use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Chat;
use App\Models\ChatParticipant;
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

    public function mount(?int $chat = null): void
    {
        $preselect = $chat ?? (int) session()->pull('support_chat_preselect', 0);
        if ($preselect <= 0) {
            return;
        }

        $target = Chat::query()
            ->with('participants.user')
            ->whereKey($preselect)
            ->where('type', ChatType::Support)
            ->first();

        if ($target === null) {
            return;
        }

        $clientOrModel = $target->participants
            ->map(fn (ChatParticipant $p) => $p->user)
            ->first(fn (?User $u) => $u !== null && in_array($u->role, [UserRole::Client, UserRole::Model], true));

        if ($clientOrModel?->role === UserRole::Model) {
            $this->activeTab = 'models';
        } else {
            $this->activeTab = 'users';
        }

        $this->selectChat($target->id);
    }

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
        $supportUserId = $this->getSupportUser()->id;

        return Chat::query()
            ->where('type', ChatType::Support)
            ->whereHas('participants.user', fn ($u) => $u->where('role', $role))
            ->with(['participants.user', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $supportUserId)
                ->where(function ($w) use ($supportUserId) {
                    $w
                        // If support participant row is missing, treat messages as unread.
                        ->whereNotExists(function ($sub) use ($supportUserId) {
                            $sub
                                ->selectRaw('1')
                                ->from('chat_participants as cp')
                                ->whereColumn('cp.chat_id', 'messages.chat_id')
                                ->where('cp.user_id', $supportUserId);
                        })
                        ->orWhereExists(function ($sub) use ($supportUserId) {
                            $sub
                                ->selectRaw('1')
                                ->from('chat_participants as cp')
                                ->whereColumn('cp.chat_id', 'messages.chat_id')
                                ->where('cp.user_id', $supportUserId)
                                ->where(function ($sq) {
                                    $sq->whereNull('cp.last_read_at')
                                        ->orWhereColumn('messages.created_at', '>', 'cp.last_read_at');
                                });
                        });
                }),
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
        $supportUserId = $this->getSupportUser()->id;

        $countForRole = function (UserRole $role) use ($supportUserId): int {
            return Message::query()
                ->where('sender_id', '!=', $supportUserId)
                ->where(function ($w) use ($supportUserId) {
                    $w
                        ->whereNotExists(function ($sub) use ($supportUserId) {
                            $sub
                                ->selectRaw('1')
                                ->from('chat_participants as cp')
                                ->whereColumn('cp.chat_id', 'messages.chat_id')
                                ->where('cp.user_id', $supportUserId);
                        })
                        ->orWhereExists(function ($sub) use ($supportUserId) {
                            $sub
                                ->selectRaw('1')
                                ->from('chat_participants as cp')
                                ->whereColumn('cp.chat_id', 'messages.chat_id')
                                ->where('cp.user_id', $supportUserId)
                                ->where(function ($sq) {
                                    $sq->whereNull('cp.last_read_at')
                                        ->orWhereColumn('messages.created_at', '>', 'cp.last_read_at');
                                });
                        });
                })
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
        $this->markSelectedChatAsRead($id);
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

        $this->markSelectedChatAsRead($this->selectedChatId);

        return Message::query()
            ->where('chat_id', $this->selectedChatId)
            ->with('sender')
            ->orderBy('created_at')
            ->get();
    }

    private function markSelectedChatAsRead(?int $chatId): void
    {
        if (! $chatId) {
            return;
        }

        $supportUser = $this->getSupportUser();
        $now = now();

        ChatParticipant::query()->updateOrCreate(
            ['chat_id' => $chatId, 'user_id' => $supportUser->id],
            ['role' => ChatParticipantRole::Support, 'last_read_at' => $now],
        );

        // Keep message-level read marks in sync for legacy consumers.
        Message::query()
            ->where('chat_id', $chatId)
            ->where('sender_id', '!=', $supportUser->id)
            ->whereNull('read_at')
            ->update(['read_at' => $now]);
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
