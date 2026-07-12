<x-filament-panels::page>
    <div class="w-full space-y-6">
        <x-filament::section icon="heroicon-o-bell-alert" icon-color="primary">
            <x-slot name="heading">Новые пользователи</x-slot>
            <x-slot name="description">Уведомление в Telegram при первом /start нового пользователя — с именем, юзернеймом и ссылкой, по которой он пришёл.</x-slot>

            <form wire:submit="save" class="space-y-4">
                {{ $this->form }}
                <x-filament::button type="submit">Сохранить</x-filament::button>
            </form>
        </x-filament::section>
    </div>
</x-filament-panels::page>
