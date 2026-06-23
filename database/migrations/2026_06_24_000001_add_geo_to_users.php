<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'last_ip')) {
                $table->string('last_ip', 45)->nullable()->after('last_seen_at');
            }
            if (! Schema::hasColumn('users', 'country')) {
                $table->string('country', 96)->nullable()->after('last_ip');
            }
            if (! Schema::hasColumn('users', 'city')) {
                $table->string('city', 96)->nullable()->after('country');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            foreach (['last_ip', 'country', 'city'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
