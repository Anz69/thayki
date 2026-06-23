<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_users')) {
            return;
        }

        Schema::table('admin_users', function (Blueprint $table): void {
            if (! Schema::hasColumn('admin_users', 'tfa_reset_at')) {
                $table->timestamp('tfa_reset_at')->nullable()->after('tg_chat_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admin_users', function (Blueprint $table): void {
            if (Schema::hasColumn('admin_users', 'tfa_reset_at')) {
                $table->dropColumn('tfa_reset_at');
            }
        });
    }
};
