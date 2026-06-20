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

class ModelProfile extends Model
{

    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
            'height_cm' => 'integer',
            'weight_kg' => 'integer',
            'bust_cm' => 'integer',
            'waist_cm' => 'integer',
            'hips_cm' => 'integer',
            'hourly_rate_thb' => 'integer',
            'commission_override' => 'decimal:4',
            'is_published' => 'boolean',
            'is_verified' => 'boolean',
            'schedule' => ModelSchedule::class,
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ModelPhoto::class)->orderBy('position');
    }

    public function priceOptions(): HasMany
    {
        return $this->hasMany(ModelPriceOption::class)->orderBy('hours');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class)->latest();
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
