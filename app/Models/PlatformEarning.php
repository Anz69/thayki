<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Immutable per-payment ledger of platform commission. The rate is snapshotted
 * at confirmation time and is never recomputed when global settings change.
 *
 * @property int $id
 * @property int $payment_id
 * @property int|null $meeting_id
 * @property int|null $model_profile_id
 * @property int $gross_minor
 * @property string $commission_rate     decimal as string from DB; cast handled below
 * @property int $commission_minor
 * @property int $net_minor
 * @property string $source              'default' | 'model_override'
 * @property Carbon $confirmed_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class PlatformEarning extends Model
{
    public const SOURCE_DEFAULT = 'default';
    public const SOURCE_MODEL_OVERRIDE = 'model_override';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'gross_minor' => 'integer',
            'commission_rate' => 'decimal:4',
            'commission_minor' => 'integer',
            'net_minor' => 'integer',
            'confirmed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Payment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** @return BelongsTo<Meeting, $this> */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** @return BelongsTo<ModelProfile, $this> */
    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }

    /**
     * @param  Builder<PlatformEarning>  $query
     * @return Builder<PlatformEarning>
     */
    public function scopeForPeriod(Builder $query, Carbon $from, Carbon $to): Builder
    {
        return $query->whereBetween('confirmed_at', [$from, $to]);
    }

    /**
     * @param  Builder<PlatformEarning>  $query
     * @return Builder<PlatformEarning>
     */
    public function scopeForModelProfile(Builder $query, int $modelProfileId): Builder
    {
        return $query->where('model_profile_id', $modelProfileId);
    }
}
