<?php

declare(strict_types=1);

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('allows participants to post and read messages', function (): void {
    $modelUser = User::factory()->model()->create();
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $client = User::factory()->create();
    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
    ]);

    $chat = Chat::query()->create(['type' => ChatType::Meeting, 'meeting_id' => $meeting->id]);
    $chat->participants()->create(['user_id' => $client->id, 'role' => ChatParticipantRole::Client]);
    $chat->participants()->create(['user_id' => $modelUser->id, 'role' => ChatParticipantRole::Model]);

    Sanctum::actingAs($client, ['role:client']);

    $this->postJson("/api/v1/chats/{$chat->id}/messages", ['body' => 'Hello!'])->assertCreated();

    $messages = $this->getJson("/api/v1/chats/{$chat->id}/messages");
    $messages->assertOk();
    $messages->assertJsonCount(1, 'data');
    $messages->assertJsonPath('data.0.body', 'Hello!');
});

it('forbids non-participants from posting', function (): void {
    $stranger = User::factory()->create();
    $chat = Chat::query()->create(['type' => ChatType::Support]);

    Sanctum::actingAs($stranger, ['role:client']);
    $this->postJson("/api/v1/chats/{$chat->id}/messages", ['body' => 'x'])->assertStatus(403);
});

it('creates a support chat for the user', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user, ['role:client']);

    $response = $this->getJson('/api/v1/chats/support');
    $response->assertOk();
    $response->assertJsonPath('data.type', 'support');
});
