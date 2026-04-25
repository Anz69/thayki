<?php

declare(strict_types=1);

use App\Models\ModelProfile;

it('returns paginated published models', function (): void {
    ModelProfile::factory()->count(3)->create(['is_published' => true]);
    ModelProfile::factory()->count(2)->create(['is_published' => false]);

    $response = $this->getJson('/api/v1/catalog/models');

    $response->assertOk();
    $response->assertJson(['ok' => true]);
    $response->assertJsonCount(3, 'data');
});

it('returns 404 for non-published model on detail', function (): void {
    $hidden = ModelProfile::factory()->create(['is_published' => false]);

    $this->getJson('/api/v1/catalog/models/'.$hidden->id)->assertStatus(404);
});

it('returns full profile for published model', function (): void {
    $profile = ModelProfile::factory()->create(['is_published' => true]);

    $response = $this->getJson('/api/v1/catalog/models/'.$profile->id);
    $response->assertOk();
    $response->assertJsonPath('data.id', $profile->id);
});
