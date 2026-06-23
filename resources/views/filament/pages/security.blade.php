<x-filament-panels::page>
    <div class="w-full max-w-2xl">
        <x-filament::section icon="heroicon-o-shield-check" icon-color="primary">
            <x-slot name="heading">Двухфакторная аутентификация</x-slot>
            <x-slot name="description">Вход в админ-панель защищён одноразовым кодом из Telegram.</x-slot>

            @if ($linked)
                <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-3">
                        <x-filament::icon icon="heroicon-s-check-circle" class="h-7 w-7 text-success-500" />
                        <div>
                            <p class="text-sm font-semibold text-gray-950 dark:text-white">Telegram привязан</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                При каждом входе код подтверждения приходит в ваш Telegram — с IP и временем попытки.
                            </p>
                        </div>
                    </div>

                    <div>
                        <x-filament::button
                            color="danger"
                            icon="heroicon-m-link-slash"
                            wire:click="unbind"
                            wire:confirm="Отвязать Telegram? Чтобы снова войти в панель, привязку придётся пройти заново."
                        >
                            Отвязать
                        </x-filament::button>
                    </div>
                </div>
            @elseif (! $botConfigured)
                <p class="text-sm text-warning-600 dark:text-warning-400">
                    Не задан <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-white/10">TELEGRAM_BOT_USERNAME</code>
                    в <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-white/10">.env</code> — без него нельзя сформировать ссылку привязки.
                </p>
            @else
                <div class="flex flex-col gap-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Нажмите кнопку — откроется бот. Подтвердите привязку («Да»), и при каждом входе сюда будет приходить одноразовый код.
                    </p>

                    <div>
                        <x-filament::button
                            tag="a"
                            href="{{ $link }}"
                            target="_blank"
                            rel="noopener"
                            icon="heroicon-m-paper-airplane"
                        >
                            Привязать Telegram
                        </x-filament::button>
                    </div>

                    <p class="text-xs text-gray-400 dark:text-gray-500">
                        Ссылка действует 10 минут. После привязки обновите страницу.
                    </p>
                </div>
            @endif
        </x-filament::section>
    </div>
</x-filament-panels::page>
