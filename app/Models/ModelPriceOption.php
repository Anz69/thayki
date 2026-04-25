<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModelPriceOptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $model_profile_id
 * @property int $hours
 * @property int $price_thb
 * @property string $label
 */
class ModelPriceOption extends Model
{
    /** @use HasFactory<ModelPriceOptionFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'hours' => 'integer',
            'price_thb' => 'integer',
        ];
    }

    /** @return BelongsTo<ModelProfile, $this> */
    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }
}
