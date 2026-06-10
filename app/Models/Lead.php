<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Lead extends Model
{

    public const VIP_GOAL = 'V.I.P модели';

    protected $guarded = ['id'];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(LeadPayment::class);
    }

    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }
}
