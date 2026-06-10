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
            if (! Schema::hasColumn('admin_users', 'tg_chat_id')) {
                $table->unsignedBigInteger('tg_chat_id')->nullable()->after('email');
            }
            if (! Schema::hasColumn('admin_users', 'notifications_enabled')) {
                $table->boolean('notifications_enabled')->default(true)->after('tg_chat_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('admin_users')) {
            return;
        }

        Schema::table('admin_users', function (Blueprint $table): void {
            if (Schema::hasColumn('admin_users', 'tg_chat_id')) {
                $table->dropColumn('tg_chat_id');
            }
            if (Schema::hasColumn('admin_users', 'notifications_enabled')) {
                $table->dropColumn('notifications_enabled');
            }
        });
    }
};
