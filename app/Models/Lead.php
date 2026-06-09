<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $manager_id
 * @property int|null $model_profile_id
 * @property string $city
 * @property string|null $hair_type
 * @property string|null $age_range
 * @property string|null $height_range
 * @property string|null $goal
 * @property string|null $wishes
 * @property LeadStatus $status
 * @property Carbon|null $identity_verified_at
 * @property int|null $chat_id
 */
class Lead extends Model
{
    /**
     * The goal value written for a V.I.P request (see the Mini App's
     * RequestPage VIP flow). It's the marker that flags a lead as VIP — there
     * is no separate column, so keep this the single source of truth.
     */
    public const VIP_GOAL = 'V.I.P модели';

    protected $guarded = ['id'];

    /** Whether this lead came through the V.I.P flow. */
    public function isVip(): bool
    {
        return $this->goal === self::VIP_GOAL;
    }

    protected function casts(): array
    {
        return [
            'status' => LeadStatus::class,
            'identity_verified_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /** @return HasMany<LeadPayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(LeadPayment::class);
    }

    /** @return BelongsTo<ModelProfile, $this> */
    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }

    /** @return BelongsTo<Chat, $this> */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }
}
