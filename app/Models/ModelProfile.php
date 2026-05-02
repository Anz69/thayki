<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ModelSchedule;
use Database\Factories\ModelProfileFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $display_name
 * @property int $age
 * @property int $height_cm
 * @property int $weight_kg
 * @property string $bust_size
 * @property string $butt_size
 * @property string|null $description
 * @property ModelSchedule $schedule
 * @property int $hourly_rate_thb
 * @property string|null $commission_override
 * @property bool $is_published
 * @property bool $is_verified
 * @property Carbon|null $published_at
 */
class ModelProfile extends Model
{
    /** @use HasFactory<ModelProfileFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
            'height_cm' => 'integer',
            'weight_kg' => 'integer',
            'hourly_rate_thb' => 'integer',
            'commission_override' => 'decimal:4',
            'is_published' => 'boolean',
            'is_verified' => 'boolean',
            'schedule' => ModelSchedule::class,
            'published_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<ModelPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(ModelPhoto::class)->orderBy('position');
    }

    /** @return HasMany<ModelPriceOption, $this> */
    public function priceOptions(): HasMany
    {
        return $this->hasMany(ModelPriceOption::class)->orderBy('hours');
    }

    /** @return HasMany<Meeting, $this> */
    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    /**
     * @param  Builder<ModelProfile>  $query
     * @return Builder<ModelProfile>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
