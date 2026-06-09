<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Persistent "the bot has already welcomed this user" flag.
 *
 * The Mini App's write-access welcome was deduped via cache, which existing
 * users don't have — so anyone who already had a dialog with the bot got a
 * spurious "Добро пожаловать" on app open. A DB flag is the once-ever source of
 * truth. Backfill every CURRENT user to true: they've already interacted, so
 * none of them should be welcomed again. New users default to false and get
 * exactly one welcome when the bot first gains the ability to message them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('bot_welcomed')->default(false)->after('is_strange');
        });

        // Existing users have already been around — don't welcome them again.
        DB::table('users')->update(['bot_welcomed' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('bot_welcomed');
        });
    }
};
