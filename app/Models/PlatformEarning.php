<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

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

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }

    public function scopeForPeriod(Builder $query, Carbon $from, Carbon $to): Builder
    {
        return $query->whereBetween('confirmed_at', [$from, $to]);
    }

    public function scopeForModelProfile(Builder $query, int $modelProfileId): Builder
    {
        return $query->where('model_profile_id', $modelProfileId);
    }
}
