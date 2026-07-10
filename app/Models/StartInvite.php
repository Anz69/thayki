<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
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

    // Users who came through this invite.
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'start_invite_uses', 'invite_id', 'user_id')
            ->withPivot('used_at');
    }

    // All leads (orders) created by users who came through this invite.
    public function leads(): HasManyThrough
    {
        return $this->hasManyThrough(
            Lead::class,
            StartInviteUse::class,
            'invite_id', // FK on start_invite_uses -> this invite
            'user_id',   // FK on leads -> the user
            'id',        // local key on start_invites
            'user_id',   // local key on start_invite_uses
        );
    }

    // How many of the arrived users created at least one order.
    public function buyersCount(): int
    {
        return $this->users()->has('leads')->count();
    }

    // Conversion: share of arrived users who created at least one order (0–100).
    public function conversionPercent(): int
    {
        $came = (int) $this->times_used;
        if ($came <= 0) {
            return 0;
        }

        return (int) round($this->buyersCount() / $came * 100);
    }

    public function isUsable(): bool
    {
        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }
        return $this->times_used < $this->max_uses;
    }
}
