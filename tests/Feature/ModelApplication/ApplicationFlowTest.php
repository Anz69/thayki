<?php

declare(strict_types=1);

use App\Enums\ModelApplicationStatus;
use App\Enums\UserRole;
use App\Models\ModelApplication;
use App\Models\ModelProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function submitPayload(): array
{
    return [
        'display_name' => 'Alice',
        'age' => 25,
        'height_cm' => 170,
        'weight_kg' => 55,
        'bust_size' => 'B',
        'butt_size' => 'M',
        'description' => 'Hi',
        'schedule' => 'day',
        'hourly_rate_thb' => 2500,
    ];
}

it('lets a client submit an application', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user, ['role:client']);

    $response = $this->postJson('/api/v1/model-application', submitPayload());
    $response->assertCreated();
    expect(ModelApplication::query()->where('user_id', $user->id)->count())->toBe(1);
});

it('forbids submitting model application more than once', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user, ['role:client']);

    $this->postJson('/api/v1/model-application', submitPayload())->assertCreated();

    $second = $this->postJson('/api/v1/model-application', submitPayload());
    $second->assertStatus(409);
    $second->assertJsonPath('error.code', 'APPLICATION_ALREADY_SUBMITTED');

    expect(ModelApplication::query()->where('user_id', $user->id)->count())->toBe(1);
});

it('creates a model profile on admin approval', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create();
    $application = ModelApplication::query()->create([
        'user_id' => $user->id,
        'payload' => submitPayload(),
        'status' => ModelApplicationStatus::Submitted,
    ]);

    Sanctum::actingAs($admin, ['role:admin']);

    $response = $this->postJson("/api/v1/admin/model-applications/{$application->id}/approve");
    $response->assertOk();

    expect(ModelProfile::query()->where('user_id', $user->id)->exists())->toBeTrue();
    expect($user->refresh()->role)->toBe(UserRole::Model);
});

it('marks application as rejected without creating profile', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create();
    $application = ModelApplication::query()->create([
        'user_id' => $user->id,
        'payload' => submitPayload(),
        'status' => ModelApplicationStatus::Submitted,
    ]);

    Sanctum::actingAs($admin, ['role:admin']);

    $this->postJson("/api/v1/admin/model-applications/{$application->id}/reject", ['note' => 'no'])->assertOk();

    expect(ModelProfile::query()->where('user_id', $user->id)->exists())->toBeFalse();
    expect($application->refresh()->status)->toBe(ModelApplicationStatus::Rejected);
});

it('forbids non-admin from approving', function (): void {
    $user = User::factory()->create();
    $application = ModelApplication::factory()->create(['status' => ModelApplicationStatus::Submitted]);

    Sanctum::actingAs($user, ['role:client']);
    $this->postJson("/api/v1/admin/model-applications/{$application->id}/approve")->assertStatus(403);
});
