<?php

declare(strict_types=1);

use App\Models\AppSetting;
use App\Models\ModelProfile;
use App\Models\PlatformEarning;
use App\Services\Commission\CommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('payments.commission', 0.15);
});

it('uses the default rate from config when no setting exists', function (): void {
    $service = app(CommissionService::class);

    expect($service->defaultRate())->toBe(0.15);
});

it('uses the default rate from app_settings when present', function (): void {
    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '0.20');
    $service = app(CommissionService::class);

    expect($service->defaultRate())->toBe(0.20);
});

it('clamps the default rate to [0, 1]', function (): void {
    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '5');
    expect(app(CommissionService::class)->defaultRate())->toBe(1.0);

    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '-2');
    expect(app(CommissionService::class)->defaultRate())->toBe(0.0);
});

it('resolves model override when set', function (): void {
    $profile = ModelProfile::factory()->make(['commission_override' => 0.10]);
    $service = app(CommissionService::class);

    $resolved = $service->resolveRate($profile);

    expect($resolved['rate'])->toBe(0.10);
    expect($resolved['source'])->toBe(PlatformEarning::SOURCE_MODEL_OVERRIDE);
});

it('falls back to default when override is null', function (): void {
    $profile = ModelProfile::factory()->make(['commission_override' => null]);
    $service = app(CommissionService::class);

    $resolved = $service->resolveRate($profile);

    expect($resolved['rate'])->toBe(0.15);
    expect($resolved['source'])->toBe(PlatformEarning::SOURCE_DEFAULT);
});

it('calculates breakdown with default rate', function (): void {
    $service = app(CommissionService::class);

    $breakdown = $service->calculate(200_000, null);

    expect($breakdown->grossMinor)->toBe(200_000);
    expect($breakdown->commissionRate)->toBe(0.15);
    expect($breakdown->commissionMinor)->toBe(30_000);
    expect($breakdown->netMinor)->toBe(170_000);
    expect($breakdown->source)->toBe(PlatformEarning::SOURCE_DEFAULT);
    // gross == commission + net (no rounding drift)
    expect($breakdown->commissionMinor + $breakdown->netMinor)->toBe($breakdown->grossMinor);
});

it('calculates breakdown with model override', function (): void {
    $profile = ModelProfile::factory()->make(['commission_override' => 0.05]);
    $service = app(CommissionService::class);

    $breakdown = $service->calculate(100_000, $profile);

    expect($breakdown->commissionRate)->toBe(0.05);
    expect($breakdown->commissionMinor)->toBe(5_000);
    expect($breakdown->netMinor)->toBe(95_000);
    expect($breakdown->source)->toBe(PlatformEarning::SOURCE_MODEL_OVERRIDE);
});

it('handles edge cases of 0% and 100% commission', function (): void {
    $service = app(CommissionService::class);

    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '0');
    $b = $service->calculate(50_000, null);
    expect($b->commissionMinor)->toBe(0);
    expect($b->netMinor)->toBe(50_000);

    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '1');
    $b = $service->calculate(50_000, null);
    expect($b->commissionMinor)->toBe(50_000);
    expect($b->netMinor)->toBe(0);
});

it('preserves gross == commission + net under non-trivial rounding', function (): void {
    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '0.1733');
    $service = app(CommissionService::class);

    $b = $service->calculate(100_001, null);
    expect($b->commissionMinor + $b->netMinor)->toBe($b->grossMinor);
});
