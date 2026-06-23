<x-filament-panels::page>
    <div class="max-w-xl space-y-6">
        @if ($linked)
            <div class="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-900/10">
                <p class="text-base font-semibold text-green-700 dark:text-green-400">✅ Telegram привязан</p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    При входе в админ-панель код подтверждения приходит в ваш Telegram (с IP и временем попытки).
                </p>
                <x-filament::button
                    color="danger"
                    size="sm"
                    class="mt-4"
                    wire:click="unbind"
                    wire:confirm="Отвязать Telegram? Двухфакторная защита перестанет работать."
                >
                    Отвязать
                </x-filament::button>
            </div>
        @elseif (! $botConfigured)
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
                <p class="text-sm text-amber-700 dark:text-amber-400">
                    Не задан <code>TELEGRAM_BOT_USERNAME</code> в <code>.env</code> — без него нельзя сформировать ссылку привязки.
                </p>
            </div>
        @else
            <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
                <p class="text-base font-semibold">Двухфакторная аутентификация через Telegram</p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Нажмите кнопку — откроется бот. Подтвердите привязку («Да»), и при каждом входе в админку
                    сюда будет приходить одноразовый код.
                </p>
                <a href="{{ $link }}" target="_blank" rel="noopener">
                    <x-filament::button tag="span" color="primary" class="mt-4">
                        Привязать Telegram
                    </x-filament::button>
                </a>
                <p class="mt-3 text-xs text-gray-400">Ссылка действует 10 минут. После привязки обновите страницу.</p>
            </div>
        @endif
    </div>
</x-filament-panels::page>
