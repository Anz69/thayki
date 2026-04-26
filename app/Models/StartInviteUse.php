<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $invite_id
 * @property int $user_id
 * @property Carbon $used_at
 */
class StartInviteUse extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<StartInvite, $this> */
    public function invite(): BelongsTo
    {
        return $this->belongsTo(StartInvite::class, 'invite_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
