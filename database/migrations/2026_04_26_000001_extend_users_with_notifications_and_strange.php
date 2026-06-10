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
            $table->boolean('is_strange')->default(true)->after('photo_customized');
            $table->boolean('notifications_enabled')->default(true)->after('is_strange');
            $table->unsignedBigInteger('tg_chat_id')->nullable()->after('notifications_enabled');

            $table->index('is_strange');
        });

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
