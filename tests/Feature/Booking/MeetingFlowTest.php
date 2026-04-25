<?php

declare(strict_types=1);

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lets a client create a meeting', function (): void {
    $client = User::factory()->create();
    $profile = ModelProfile::factory()->create();

    Sanctum::actingAs($client, ['role:client']);

    $response = $this->postJson('/api/v1/meetings', [
        'model_profile_id' => $profile->id,
        'scheduled_at' => now()->addDays(2)->toIso8601String(),
        'duration_hours' => 2,
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.status', 'pending');
    expect(Meeting::query()->count())->toBe(1);
});

it('rejects overlapping meetings', function (): void {
    $client = User::factory()->create();
    $profile = ModelProfile::factory()->create();

    $start = now()->addDays(2)->setTime(20, 0);

    Meeting::factory()->create([
        'model_profile_id' => $profile->id,
        'scheduled_at' => $start,
        'duration_hours' => 2,
        'status' => MeetingStatus::Accepted,
    ]);

    Sanctum::actingAs($client, ['role:client']);

    $response = $this->postJson('/api/v1/meetings', [
        'model_profile_id' => $profile->id,
        'scheduled_at' => $start->copy()->addHour()->toIso8601String(),
        'duration_hours' => 1,
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'SLOT_TAKEN');
});

it('allows the model owner to accept the meeting', function (): void {
    $modelUser = User::factory()->model()->create();
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $client = User::factory()->create();

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Pending,
    ]);

    Sanctum::actingAs($modelUser, ['role:model']);

    $response = $this->postJson("/api/v1/meetings/{$meeting->id}/accept");
    $response->assertOk();
    $response->assertJsonPath('data.status', 'accepted');
});

it('rejects meeting actions from non-participants', function (): void {
    $stranger = User::factory()->create();
    $meeting = Meeting::factory()->create();

    Sanctum::actingAs($stranger, ['role:client']);

    $this->postJson("/api/v1/meetings/{$meeting->id}/accept")->assertStatus(403);
});

it('forbids invalid meeting status transitions', function (): void {
    $modelUser = User::factory()->model()->create();
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);

    $meeting = Meeting::factory()->create([
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Completed,
    ]);

    Sanctum::actingAs($modelUser, ['role:model']);

    $this->postJson("/api/v1/meetings/{$meeting->id}/accept")->assertStatus(409);
});
