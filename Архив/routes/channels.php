<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Chat;
use App\Models\ModelProfile;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('users.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

Broadcast::channel('chats.{id}', function (User $user, int $id): bool {
    $chat = Chat::query()->find($id);
    if ($chat === null) {
        return false;
    }

    if ($user->role === UserRole::Admin) {
        return true;
    }

    return $chat->isParticipant($user);
});

Broadcast::channel('model-profiles.{id}', function (User $user, int $id): bool {
    $profile = ModelProfile::query()->find($id);
    if ($profile === null) {
        return false;
    }

    return $profile->user_id === $user->id || $user->role === UserRole::Admin;
});
