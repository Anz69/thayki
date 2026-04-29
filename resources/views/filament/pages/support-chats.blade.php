<x-filament-panels::page>
    <style>
        .fi-main { background: #0d0d0d !important; }
        #support-chat-wrap * { box-sizing: border-box; }
        #support-chat-wrap ::-webkit-scrollbar { width: 4px; }
        #support-chat-wrap ::-webkit-scrollbar-track { background: transparent; }
        #support-chat-wrap ::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
        #support-chat-wrap textarea:focus,
        #support-chat-wrap textarea:focus-visible { outline: none !important; box-shadow: none !important; }

        @keyframes msgIn {
            from { opacity: 0; transform: translateY(10px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .msg-new { animation: msgIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        #photo-lightbox {
            display: none;
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.9);
            align-items: center; justify-content: center;
        }
        #photo-lightbox.open { display: flex; }
        #photo-lightbox img { max-width: 92vw; max-height: 88vh; border-radius: 12px; object-fit: contain; }
        #photo-lightbox-close {
            position: absolute; top: 20px; right: 20px;
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(255,255,255,0.1); border: none; cursor: pointer;
            color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center;
        }
        #photo-lightbox-close:hover { background: rgba(255,255,255,0.2); }
        .msg-img {
            width: 180px; height: 160px; border-radius: 14px; overflow: hidden;
            background: #1e1e1e; cursor: pointer; position: relative; display: block;
        }
        .msg-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .msg-img:hover { opacity: 0.85; }
        .attach-btn {
            width: 36px; height: 36px; border-radius: 50%; background: #1e1e1e;
            border: 1px solid #2a2a2a; cursor: pointer; display: flex;
            align-items: center; justify-content: center; flex-shrink: 0;
            transition: background .15s;
        }
        .attach-btn:hover { background: #2a2a2a; }
        .attach-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>

    <div id="photo-lightbox" onclick="if(event.target===this)closeLightbox()">
        <button id="photo-lightbox-close" onclick="closeLightbox()">✕</button>
        <img id="photo-lightbox-img" src="" alt="">
    </div>

    <div
        id="support-chat-wrap"
        class="flex rounded-2xl overflow-hidden"
        style="height: calc(100vh - 9rem); background: #111; border: 1px solid #222;"
    >
        {{-- LEFT — chat list --}}
        <div class="flex flex-col shrink-0" style="width:300px; border-right:1px solid #1e1e1e; background:#0d0d0d;">

            <div style="padding:16px 14px 12px; border-bottom:1px solid #1e1e1e;">
                @php $unread = $this->getUnreadCounts(); @endphp
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button
                        wire:click="setTab('users')"
                        style="flex:1;padding:6px 8px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:background .12s,color .12s;
                               background:{{ $activeTab === 'users' ? '#E2319B' : '#1a1a1a' }};
                               color:{{ $activeTab === 'users' ? '#fff' : '#888' }};"
                    >
                        Пользователи
                        @if($unread['users'] > 0)
                            <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:{{ $activeTab === 'users' ? 'rgba(255,255,255,0.3)' : '#E2319B' }};color:#fff;font-size:10px;margin-left:4px;">{{ $unread['users'] }}</span>
                        @endif
                    </button>
                    <button
                        wire:click="setTab('models')"
                        style="flex:1;padding:6px 8px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:background .12s,color .12s;
                               background:{{ $activeTab === 'models' ? '#E2319B' : '#1a1a1a' }};
                               color:{{ $activeTab === 'models' ? '#fff' : '#888' }};"
                    >
                        Модели
                        @if($unread['models'] > 0)
                            <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:{{ $activeTab === 'models' ? 'rgba(255,255,255,0.3)' : '#E2319B' }};color:#fff;font-size:10px;margin-left:4px;">{{ $unread['models'] }}</span>
                        @endif
                    </button>
                </div>
                <div style="position:relative;">
                    <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#444;width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"/>
                    </svg>
                    <input
                        wire:model.live.debounce.300ms="search"
                        type="text"
                        placeholder="Поиск..."
                        style="width:100%;padding:7px 10px 7px 32px;font-size:13px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#ddd;transition:border-color .15s;"
                        onfocus="this.style.borderColor='#444'" onblur="this.style.borderColor='#2a2a2a'"
                    />
                </div>
            </div>

            <div style="flex:1;overflow-y:auto;">
                @forelse($this->getChats() as $chat)
                    @php
                        $client     = $chat->participants->firstWhere(fn($p) => $p->user && ! in_array($p->user->role->value, ['admin','support']))?->user;
                        $lastMsg    = $chat->messages->first();
                        $initial    = strtoupper(substr($client?->first_name ?? 'U', 0, 1));
                        $fullName   = trim(($client?->first_name ?? '').' '.($client?->last_name ?? '')) ?: 'Пользователь';
                        $isSelected = $selectedChatId === $chat->id;
                        $unreadCount = (int) ($chat->unread_count ?? 0);
                        $lastMsgPreview = $lastMsg
                            ? ($lastMsg->attachment_path ? '📷 Фото' : Str::limit($lastMsg->body, 34))
                            : '';
                    @endphp
                    <button
                        wire:click="selectChat({{ $chat->id }})"
                        style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 14px;text-align:left;border:none;cursor:pointer;transition:background .12s;
                               background:{{ $isSelected ? '#1a1a1a' : 'transparent' }};
                               border-left:2px solid {{ $isSelected ? '#E2319B' : 'transparent' }};"
                        onmouseenter="if(!{{ $isSelected ? 'true' : 'false' }})this.style.background='#161616'"
                        onmouseleave="if(!{{ $isSelected ? 'true' : 'false' }})this.style.background='transparent'"
                    >
                        <div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;
                                    background:{{ $isSelected ? '#E2319B' : '#2a2a2a' }};">
                            @if($client?->photo_url)
                                <img src="{{ $client->photo_url }}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.insertAdjacentText('beforeend','{{ $initial }}')">
                            @else
                                {{ $initial }}
                            @endif
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
                                <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                                    <span style="font-size:13px;font-weight:600;color:{{ $isSelected ? '#fff' : '#ccc' }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                        {{ $fullName }}
                                    </span>
                                    @if($unreadCount > 0)
                                        <span style="min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#E2319B;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;">
                                            {{ $unreadCount > 99 ? '99+' : $unreadCount }}
                                        </span>
                                    @endif
                                </div>
                                @if($lastMsg)
                                    <span style="font-size:10px;color:#444;flex-shrink:0;">{{ $lastMsg->created_at->diffForHumans(short: true) }}</span>
                                @endif
                            </div>
                            @if($client?->username)
                                <div style="font-size:11px;color:#555;margin-top:1px;">{{ $client->username }}</div>
                            @endif
                            @if($lastMsg)
                                <div style="font-size:12px;color:#555;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    {{ $lastMsgPreview }}
                                </div>
                            @endif
                        </div>
                    </button>
                @empty
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;text-align:center;">
                        <svg style="width:32px;height:32px;color:#333;margin-bottom:8px;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/>
                        </svg>
                        <p style="font-size:13px;color:#444;">Нет активных чатов</p>
                    </div>
                @endforelse
            </div>
        </div>

        {{-- RIGHT — messages --}}
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;background:#111;">
            @php $selectedChat = $this->getSelectedChat(); @endphp

            @if($selectedChatId && $selectedChat)
                @php
                    $chatClient = $selectedChat->participants->firstWhere(fn($p) => $p->user && ! in_array($p->user->role->value, ['admin','support']))?->user;
                    $clientName = trim(($chatClient?->first_name ?? '').' '.($chatClient?->last_name ?? '')) ?: 'Пользователь';
                @endphp

                <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #1e1e1e;flex-shrink:0;">
                    @php $headerInitial = strtoupper(substr($chatClient?->first_name ?? 'U', 0, 1)); @endphp
                    <div style="width:36px;height:36px;border-radius:50%;background:#E2319B;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;">
                        @if($chatClient?->photo_url)
                            <img src="{{ $chatClient->photo_url }}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.insertAdjacentText('beforeend','{{ $headerInitial }}')">
                        @else
                            {{ $headerInitial }}
                        @endif
                    </div>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:#eee;">{{ $clientName }}</div>
                        @if($chatClient?->username)
                            <div style="font-size:12px;color:#555;">{{ $chatClient->username }}</div>
                        @endif
                    </div>
                    <div style="margin-left:auto;">
                        <span style="font-size:11px;color:#555;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:99px;padding:3px 10px;">Поддержка</span>
                    </div>
                </div>

                <div id="msg-list" wire:poll.2s data-chat-id="{{ $selectedChatId }}" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:4px;">
                    @forelse($this->getMessages() as $message)
                        @php $isSupport = in_array($message->sender?->role->value, ['admin','support']); @endphp
                        <div
                            data-msg-id="{{ $message->id }}"
                            style="display:flex;justify-content:{{ $isSupport ? 'flex-end' : 'flex-start' }};margin-bottom:2px;"
                        >
                            <div style="max-width:62%;display:flex;flex-direction:column;align-items:{{ $isSupport ? 'flex-end' : 'flex-start' }};gap:3px;">
                                @if($message->attachment_path && $message->attachmentUrl())
                                    <div
                                        class="msg-img"
                                        onclick="openLightbox('{{ $message->attachmentUrl() }}')"
                                        title="Нажмите для просмотра"
                                    >
                                        <img src="{{ $message->attachmentUrl() }}" alt="Фото" loading="lazy">
                                    </div>
                                @elseif($message->body)
                                    <div style="padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.5;word-break:break-word;
                                                {{ $isSupport
                                                    ? 'background:#E2319B;color:#fff;border-bottom-right-radius:4px;'
                                                    : 'background:#1e1e1e;color:#ccc;border-bottom-left-radius:4px;' }}">
                                        {{ $message->body }}
                                    </div>
                                @endif
                                <span style="font-size:10px;color:#444;padding:0 4px;">{{ $message->created_at->format('H:i') }}</span>
                            </div>
                        </div>
                    @empty
                        <div style="flex:1;display:flex;align-items:center;justify-content:center;">
                            <p style="font-size:13px;color:#444;">Нет сообщений</p>
                        </div>
                    @endforelse
                </div>

                <div style="padding:12px 16px 16px;border-top:1px solid #1e1e1e;flex-shrink:0;">
                    <input type="file" id="admin-attach-input" accept="image/*" style="display:none" onchange="handleAdminAttach(event)">
                    <div style="display:flex;align-items:flex-end;gap:10px;">
                        <button
                            class="attach-btn"
                            id="admin-attach-btn"
                            type="button"
                            title="Прикрепить фото"
                            onclick="document.getElementById('admin-attach-input').click()"
                        >
                            <svg width="16" height="16" fill="none" stroke="#888" stroke-width="1.75" viewBox="0 0 21 21">
                                <path d="M14.2275 5.71149L7.31849 12.6205C6.69202 13.247 6.69202 14.2627 7.31849 14.8891C7.94495 15.5156 8.96065 15.5156 9.58712 14.8891L16.393 8.08325C17.646 6.83031 17.646 4.79891 16.393 3.54598C15.1401 2.29305 13.1087 2.29305 11.8558 3.54598L5.15297 10.2488C3.27357 12.1282 3.27357 15.1753 5.15297 17.0547C7.03237 18.9341 10.0795 18.9341 11.9589 17.0547L16.5993 12.4143" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <div style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;padding:10px 14px;">
                            <textarea
                                wire:model.defer="newMessage"
                                wire:keydown.enter.prevent="sendReply"
                                rows="1"
                                placeholder="Написать ответ..."
                                style="outline:none;width:100%;background:transparent;font-size:14px;color:#ddd;border:none;resize:none;max-height:100px;overflow-y:auto;line-height:1.5;"
                                oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"
                            ></textarea>
                        </div>
                        <button
                            wire:click="sendReply"
                            style="width:40px;height:40px;border-radius:50%;background:#E2319B;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .1s;"
                            onmouseenter="this.style.background='#c9197f'" onmouseleave="this.style.background='#E2319B'"
                            onmousedown="this.style.transform='scale(.9)'" onmouseup="this.style.transform='scale(1)'"
                        >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="#fff" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/>
                            </svg>
                        </button>
                    </div>
                </div>

            @else
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:32px;">
                    <div style="width:56px;height:56px;border-radius:50%;background:#1a1a1a;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center;">
                        <svg style="width:24px;height:24px;color:#444;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>
                        </svg>
                    </div>
                    <p style="font-size:13px;color:#444;">Выберите чат слева</p>
                </div>
            @endif
        </div>
    </div>

    <script>
    (function () {
        function scrollBottom() {
            const list = document.getElementById('msg-list');
            if (list) list.scrollTop = list.scrollHeight;
        }

        function animateNewMessages() {
            document.querySelectorAll('[data-msg-id]:not([data-animated])').forEach(function (el) {
                el.setAttribute('data-animated', '1');
                el.classList.add('msg-new');
            });
        }

        document.addEventListener('livewire:init', function () {
            document.querySelectorAll('[data-msg-id]').forEach(function (el) {
                el.setAttribute('data-animated', '1');
            });
            scrollBottom();
        });

        document.addEventListener('livewire:update', function () {
            scrollBottom();
            requestAnimationFrame(animateNewMessages);
        });
    })();

    function openLightbox(src) {
        document.getElementById('photo-lightbox-img').src = src;
        document.getElementById('photo-lightbox').classList.add('open');
    }

    function closeLightbox() {
        document.getElementById('photo-lightbox').classList.remove('open');
        document.getElementById('photo-lightbox-img').src = '';
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLightbox();
    });

    let _attachLock = false;
    function handleAdminAttach(event) {
        if (_attachLock) return;
        _attachLock = true;

        const file = event.target.files[0];
        event.target.value = '';
        if (!file) { _attachLock = false; return; }

        const btn = document.getElementById('admin-attach-btn');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            @this.call('uploadAttachment', { data: data, mime: file.type, name: file.name })
                .finally(function() {
                    _attachLock = false;
                    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
                });
        };
        reader.readAsDataURL(file);
    }
    </script>
</x-filament-panels::page>
