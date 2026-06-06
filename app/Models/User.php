<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property int $telegram_id
 * @property string|null $username
 * @property string $first_name
 * @property string|null $last_name
 * @property string|null $language_code
 * @property string|null $photo_url
 * @property bool $photo_customized
 * @property bool $is_strange
 * @property bool $notifications_enabled
 * @property int|null $tg_chat_id
 * @property UserRole $role
 * @property UserStatus $status
 * @property Carbon|null $last_auth_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Mass-assignable columns.
     *
     * Note: even though `role`, `status` and `last_auth_at` appear here so
     * that admin actions and seeders/factories can assign them via ->fill(),
     * end-user request payloads are filtered through dedicated FormRequest
     * objects (see `UpdateMyProfileRequest`, `UpdateMyModelProfileRequest`)
     * which never expose those keys. The id column stays implicit-protected.
     *
     * @var list<string>
     */
    protected $fillable = [
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'language_code',
        'photo_url',
        'photo_customized',
        'is_strange',
        'notifications_enabled',
        'tg_chat_id',
        'role',
        'status',
        'last_auth_at',
        'last_seen_at',
    ];

    /** @var list<string> */
    protected $hidden = [
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'telegram_id' => 'integer',
            'tg_chat_id' => 'integer',
            'photo_customized' => 'boolean',
            'is_strange' => 'boolean',
            'notifications_enabled' => 'boolean',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'last_auth_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /** @return HasOne<ModelProfile, $this> */
    public function modelProfile(): HasOne
    {
        return $this->hasOne(ModelProfile::class);
    }

    /** @return HasOne<Wallet, $this> */
    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    /** @return HasOne<ModelApplication, $this> */
    public function modelApplication(): HasOne
    {
        return $this->hasOne(ModelApplication::class);
    }

    /** @return HasMany<Meeting, $this> */
    public function meetingsAsClient(): HasMany
    {
        return $this->hasMany(Meeting::class, 'client_id');
    }

    /** @return HasMany<Withdrawal, $this> */
    public function withdrawals(): HasMany
    {
        return $this->hasMany(Withdrawal::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isModel(): bool
    {
        return $this->role === UserRole::Model;
    }

    public function isManager(): bool
    {
        return $this->role === UserRole::Manager;
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client;
    }
}
