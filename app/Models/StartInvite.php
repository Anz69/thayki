<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $token
 * @property string $kind     'verify' | 'model'
 * @property string|null $label
 * @property int|null $created_by_admin_id
 * @property int|null $created_by_user_id
 * @property int $max_uses
 * @property int $times_used
 * @property Carbon|null $expires_at
 */
class StartInvite extends Model
{
    public const KIND_VERIFY = 'verify';
    public const KIND_MODEL  = 'model';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'max_uses' => 'integer',
            'times_used' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by_admin_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return HasMany<StartInviteUse, $this> */
    public function uses(): HasMany
    {
        return $this->hasMany(StartInviteUse::class, 'invite_id');
    }

    public function isUsable(): bool
    {
        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }
        return $this->times_used < $this->max_uses;
    }
}
