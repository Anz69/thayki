<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Chat;
use App\Models\Meeting;
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

Broadcast::channel('meeting.{id}', function (User $user, int $id): bool {
    $meeting = Meeting::query()->find($id);
    if ($meeting === null) {
        return false;
    }

    if ($user->role === UserRole::Admin) {
        return true;
    }

    if ($meeting->client_id === $user->id) {
        return true;
    }

    $profile = $user->modelProfile()->first();

    return $profile !== null && $profile->id === $meeting->model_profile_id;
});

Broadcast::channel('model-profiles.{id}', function (User $user, int $id): bool {
    $profile = ModelProfile::query()->find($id);
    if ($profile === null) {
        return false;
    }

    return $profile->user_id === $user->id || $user->role === UserRole::Admin;
});
