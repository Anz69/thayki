<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends `users` for the bot-notification + double-bottom flow:
 *   - `is_strange`           — true until the user has been verified via an
 *                              invite deep-link. Strange users only see a
 *                              "join our chat" stub screen and do not get the
 *                              full Mini App experience. New users default to
 *                              strange so an unverified visitor cannot bypass
 *                              the gate by going straight to the Mini App URL.
 *   - `notifications_enabled` — Telegram-bot notifications opt-out (default
 *                              true; the More-page toggle flips it).
 *   - `tg_chat_id`           — destination chat for bot.sendMessage. Captured
 *                              the first time the user pings the bot (typically
 *                              via /start). Without it we cannot push to the
 *                              user, so notifications are silently skipped.
 *
 * Drops `is_premium` — never used in product, only set on auth and shown in
 * Filament. Dead weight.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_strange')->default(true)->after('photo_customized');
            $table->boolean('notifications_enabled')->default(true)->after('is_strange');
            $table->unsignedBigInteger('tg_chat_id')->nullable()->after('notifications_enabled');

            $table->index('is_strange');
        });

        // Backfill: any user that already exists in the system before this
        // migration ran is presumed to be a real, verified user — flip them
        // to non-strange so they don't get gated post-deploy.
        \Illuminate\Support\Facades\DB::table('users')->update(['is_strange' => false]);

        if (Schema::hasColumn('users', 'is_premium')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('is_premium');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['is_strange']);
            $table->dropColumn(['is_strange', 'notifications_enabled', 'tg_chat_id']);
            $table->boolean('is_premium')->default(false)->after('photo_customized');
        });
    }
};
