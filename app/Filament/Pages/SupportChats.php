<?php

namespace App\Filament\Pages;

use App\Actions\Chat\EnsureSupportChatAction;
use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\LeadStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Lead;
use App\Models\Message;
use App\Models\User;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Livewire\Attributes\Url;

class SupportChats extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationGroup = 'Поддержка';

    protected static ?string $navigationLabel = 'Чат поддержки';

    protected static ?int $navigationSort = 1;

    protected static string $view = 'filament.pages.support-chats';

    public ?int $selectedChatId = null;

    public string $newMessage = '';

    public string $search = '';

    /** 'leads' = заявки на подбор (ChatType::Lead), 'support' = поддержка (ChatType::Support). */
    public string $activeTab = 'leads';

    /** Synced with query string ?user= — deep links from admin (e.g. complaints) preselect the chat. */
    #[Url(as: 'user', except: null)]
    public ?int $urlUser = null;

    #[Url(as: 'chat', except: null)]
    public ?int $urlChat = null;

    protected $listeners = ['$refresh', 'new-message-received' => '$refresh'];

    public function mount(): void
    {
        $this->applyUrlPreselect();
    }

    /**
     * Resolve ?user= / ?chat= from Livewire URL props or raw request (Filament full-page links).
     */
    private function applyUrlPreselect(): void
    {
        $userId = $this->positiveIntOrNull($this->urlUser);
        if ($userId === null && request()->filled('user')) {
            $userId = $this->positiveIntOrNull((int) request()->query('user'));
        }

        $chatId = $this->positiveIntOrNull($this->urlChat);
        if ($chatId === null && request()->filled('chat')) {
            $chatId = $this->positiveIntOrNull((int) request()->query('chat'));
        }

        if ($userId !== null) {
            $targetUser = User::find($userId);
            if ($targetUser !== null) {
                $ensured = app(EnsureSupportChatAction::class)->execute($targetUser);
                $chatId = $ensured->id;
            }
        }

        $preselect = $chatId ?? (int) session()->pull('support_chat_preselect', 0);
        if ($preselect <= 0) {
            return;
        }

        $target = Chat::query()
            ->with('participants.user')
            ->whereKey($preselect)
            ->whereIn('type', [ChatType::Support, ChatType::Lead])
            ->first();

        if ($target === null) {
            return;
        }

        $this->activeTab = $target->type === ChatType::Support ? 'support' : 'leads';

        $this->selectChat($target->id);
    }

    private function positiveIntOrNull(?int $value): ?int
    {
        if ($value === null || $value <= 0) {
            return null;
        }

        return $value;
    }

    public function getTitle(): string|Htmlable
    {
        return 'Чат поддержки';
    }

    public function setTab(string $tab): void
    {
        $this->activeTab = $tab;
        $this->selectedChatId = null;
        $this->newMessage = '';
    }

    public function getChats(): Collection
    {
        $type = $this->activeTab === 'support' ? ChatType::Support : ChatType::Lead;
        $supportUserId = $this->getSupportUser()->id;

        return Chat::query()
            ->where('type', $type)
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
                    ->orWhere('last_name', 'like', "%{$this->search}%")
                    ->orWhere('username', 'like', "%{$this->search}%")
            ))
            ->orderByDesc('last_message_at')
            ->get();
    }

    public function getUnreadCounts(): array
    {
        $supportUserId = $this->getSupportUser()->id;

        $countForType = function (ChatType $type) use ($supportUserId): int {
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
                ->whereHas('chat', fn ($q) => $q->where('type', $type))
                ->count();
        };

        return [
            'leads' => $countForType(ChatType::Lead),
            'support' => $countForType(ChatType::Support),
        ];
    }

    public function selectChat(int $id): void
    {
        $this->selectedChatId = $id;
        $this->newMessage = '';
        $this->markSelectedChatAsRead($id);
    }

    public function getSelectedChat(): ?Chat
    {
        if (! $this->selectedChatId) {
            return null;
        }

        return Chat::with(['participants.user'])->find($this->selectedChatId);
    }

    public function getMessages(): Collection
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

    /**
     * When a manager replies in a lead chat, move the lead from "new" to
     * "in progress" automatically (only if it's still new).
     */
    private function markLeadInProgress(Chat $chat): void
    {
        if ($chat->type !== ChatType::Lead) {
            return;
        }

        Lead::query()
            ->where('chat_id', $chat->id)
            ->where('status', LeadStatus::New->value)
            ->update(['status' => LeadStatus::InProgress->value]);
    }

    private function getSupportUser(): User
    {
        return User::firstOrCreate(
            ['telegram_id' => 0],
            [
                'first_name' => 'Поддержка',
                'username' => 'support',
                'role' => UserRole::Admin,
                'status' => UserStatus::Active,
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

            $mime = $fileData['mime'] ?? 'image/jpeg';
            $extension = match (true) {
                str_contains($mime, 'png') => 'png',
                str_contains($mime, 'webp') => 'webp',
                default => 'jpg',
            };

            $uploaded = new UploadedFile(
                $tmpPath,
                'attachment.'.$extension,
                $mime,
                null,
                true,
            );

            $supportUser = $this->getSupportUser();
            $chat = Chat::with('participants')->find($this->selectedChatId);

            if ($chat === null) {
                Notification::make()->title('Чат не найден.')->danger()->send();

                return;
            }

            if (! $chat->participants()->where('user_id', $supportUser->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $supportUser->id,
                    'role' => ChatParticipantRole::Support,
                ]);
                $chat->load('participants');
            }

            app(PostMessageAction::class)->execute($supportUser, $chat, null, $uploaded);
            $this->markLeadInProgress($chat);

            @unlink($tmpPath);
        } catch (\Throwable $e) {
            Log::error('[SupportChats] uploadAttachment failed', [
                'chat_id' => $this->selectedChatId,
                'error' => $e->getMessage(),
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
            $chat = Chat::with('participants')->find($this->selectedChatId);

            if ($chat === null) {
                Notification::make()->title('Чат не найден.')->danger()->send();
                $this->selectedChatId = null;

                return;
            }

            if (! $chat->participants()->where('user_id', $supportUser->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $supportUser->id,
                    'role' => ChatParticipantRole::Support,
                ]);
                $chat->load('participants');
            }

            app(PostMessageAction::class)->execute($supportUser, $chat, $msg);
            $this->markLeadInProgress($chat);

            $this->newMessage = '';
        } catch (\Throwable $e) {
            Log::error('[SupportChats] sendReply failed', [
                'chat_id' => $this->selectedChatId,
                'error' => $e->getMessage(),
            ]);
            Notification::make()
                ->title('Не удалось отправить сообщение.')
                ->body($e->getMessage())
                ->danger()
                ->send();
        }
    }
}
