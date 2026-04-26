<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `last_seen_at` is the timestamp of the user's most recent authenticated
 * API call (driven by App\Http\Middleware\TouchLastSeen). It powers the
 * "была в сети: <relative>" pill in chat headers.
 *
 * Distinct from `last_auth_at`, which only fires on /auth/telegram (login).
 * `last_seen_at` is meant to give a real-time presence proxy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('last_auth_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'last_seen_at')) {
                $table->dropColumn('last_seen_at');
            }
        });
    }
};
