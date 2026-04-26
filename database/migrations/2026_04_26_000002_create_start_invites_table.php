<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deep-link invitation tokens for the bot's /start handler.
 *
 * Two kinds:
 *   - 'verify' : flips an existing user's `is_strange` flag to false. Created
 *                by admins (and shareable from the Mini App's "share" sheet)
 *                so existing verified users can bring in friends.
 *   - 'model'  : sends the user down the "become a model" flow. Created only
 *                by admins from the Filament panel.
 *
 * Tokens are random URL-safe strings. The bot deep-link is built as
 * https://t.me/<bot_username>?start=<token>. When the user taps the link,
 * Telegram delivers `/start <token>` to the bot — see TelegramWebhookController.
 *
 * `max_uses` defaults to 1 (single-use), but can be raised by the admin for
 * mass invites. Once `times_used` ≥ `max_uses` the token is dead.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('start_invites', function (Blueprint $table): void {
            $table->id();
            $table->string('token', 64)->unique();
            $table->string('kind', 16); // 'verify' | 'model'
            $table->string('label', 255)->nullable(); // for admin reference
            $table->foreignId('created_by_admin_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('max_uses')->default(1);
            $table->unsignedInteger('times_used')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['kind', 'token']);
        });

        Schema::create('start_invite_uses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invite_id')->constrained('start_invites')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('used_at')->useCurrent();

            $table->unique(['invite_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('start_invite_uses');
        Schema::dropIfExists('start_invites');
    }
};
