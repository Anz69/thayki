@php
    use App\Enums\LeadStatus;
    use App\Filament\Pages\SupportChats;

    $statusLabel = fn (LeadStatus $s) => match ($s) {
        LeadStatus::New => 'Новая',
        LeadStatus::InProgress => 'В работе',
        LeadStatus::Closed => 'Закрыта',
    };
    $statusClasses = fn (LeadStatus $s) => match ($s) {
        LeadStatus::New => 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-300',
        LeadStatus::InProgress => 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300',
        LeadStatus::Closed => 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
    };
@endphp

<div class="space-y-2">
    @forelse ($leads as $lead)
        @php
            $name = trim(($lead->user?->first_name ?? '') . ' ' . ($lead->user?->last_name ?? '')) ?: '—';
        @endphp
        <div class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/10">
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-medium text-gray-950 dark:text-white">{{ $name }}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {{ $statusClasses($lead->status) }}">
                        {{ $statusLabel($lead->status) }}
                    </span>
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    📍 {{ $lead->city ?: '—' }}
                    @if ($lead->user?->username)
                        · {{ '@' . $lead->user->username }}
                    @endif
                    @if ($lead->created_at)
                        · {{ $lead->created_at->diffForHumans() }}
                    @endif
                </div>
                @if ($lead->wishes)
                    <div class="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{{ $lead->wishes }}</div>
                @endif
            </div>

            @if ($lead->chat_id)
                <a
                    href="{{ SupportChats::getUrl(['chat' => $lead->chat_id]) }}"
                    class="shrink-0 whitespace-nowrap text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                >
                    Открыть чат →
                </a>
            @endif
        </div>
    @empty
        <p class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            По этой анкете заявок пока нет.
        </p>
    @endforelse
</div>
