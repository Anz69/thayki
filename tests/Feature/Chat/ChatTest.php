<?php

declare(strict_types=1);

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('allows participants to post and read messages', function (): void {
    $client = User::factory()->create();

    $chat = Chat::query()->create(['type' => ChatType::Support]);
    $chat->participants()->create(['user_id' => $client->id, 'role' => ChatParticipantRole::Client]);

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

it('marks requisites chat read per participant without global message read_at', function (): void {
    $managerA = User::factory()->create(['role' => \App\Enums\UserRole::Manager]);
    $managerB = User::factory()->create(['role' => \App\Enums\UserRole::Manager]);
    $requisite = User::factory()->create(['role' => \App\Enums\UserRole::Requisite]);

    $chat = Chat::query()->create(['type' => ChatType::Requisites]);
    $chat->participants()->create(['user_id' => $managerA->id, 'role' => ChatParticipantRole::Support]);
    $chat->participants()->create(['user_id' => $requisite->id, 'role' => ChatParticipantRole::Requisites]);

    $message = \App\Models\Message::query()->create([
        'chat_id' => $chat->id,
        'sender_id' => $requisite->id,
        'body' => 'Payment details',
        'type' => 'text',
    ]);

    Sanctum::actingAs($managerA, ['role:manager']);
    $this->postJson("/api/v1/chats/{$chat->id}/read")->assertNoContent();

    $message->refresh();
    expect($message->read_at)->toBeNull();

    $managerAParticipant = $chat->participants()->where('user_id', $managerA->id)->first();
    expect($managerAParticipant->fresh()->last_read_at)->not->toBeNull();

    $managerBParticipant = $chat->participants()->where('user_id', $managerB->id)->first();
    expect($managerBParticipant)->toBeNull();
});

it('returns support chat client name in messages meta for managers', function (): void {
    $client = User::factory()->create(['first_name' => 'Ivan', 'last_name' => 'Petrov']);
    $manager = User::factory()->create(['role' => \App\Enums\UserRole::Manager]);

    $chat = Chat::query()->create(['type' => ChatType::Support]);
    $chat->participants()->create(['user_id' => $client->id, 'role' => ChatParticipantRole::Client]);
    $chat->participants()->create(['user_id' => $manager->id, 'role' => ChatParticipantRole::Support]);

    Sanctum::actingAs($manager, ['role:manager']);

    $response = $this->getJson("/api/v1/chats/{$chat->id}/messages");
    $response->assertOk();
    $response->assertJsonPath('meta.chat.type', 'support');
    $response->assertJsonPath('meta.chat.title', 'Ivan Petrov');
});
