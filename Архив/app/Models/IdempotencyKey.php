<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $key
 * @property string $request_hash
 * @property string $method
 * @property string $path
 * @property array<string, mixed>|null $response
 * @property int|null $status_code
 * @property Carbon $expires_at
 */
class IdempotencyKey extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'response' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
