<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

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

    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by_admin_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

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
