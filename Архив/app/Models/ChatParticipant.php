<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ChatParticipantRole;
use Database\Factories\ChatParticipantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $chat_id
 * @property int $user_id
 * @property ChatParticipantRole $role
 * @property Carbon|null $last_read_at
 */
class ChatParticipant extends Model
{
    /** @use HasFactory<ChatParticipantFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'role' => ChatParticipantRole::class,
            'last_read_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Chat, $this> */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
