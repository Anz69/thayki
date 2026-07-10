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

class User extends Authenticatable
{

    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'language_code',
        'language_chosen',
        'photo_url',
        'photo_customized',
        'is_strange',
        'bot_welcomed',
        'notifications_enabled',
        'can_delete_messages',
        'tg_chat_id',
        'role',
        'status',
        'last_auth_at',
        'last_seen_at',
    ];

    protected $hidden = [
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'telegram_id' => 'integer',
            'tg_chat_id' => 'integer',
            'photo_customized' => 'boolean',
            'language_chosen' => 'boolean',
            'is_strange' => 'boolean',
            'bot_welcomed' => 'boolean',
            'notifications_enabled' => 'boolean',
            'can_delete_messages' => 'boolean',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'last_auth_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function modelProfile(): HasOne
    {
        return $this->hasOne(ModelProfile::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function inviteUses(): HasMany
    {
        return $this->hasMany(StartInviteUse::class);
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
