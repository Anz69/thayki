<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bot_notifications', function (Blueprint $table): void {
            $table->unsignedBigInteger('lead_id')->nullable()->after('user_id');
            $table->index(['user_id', 'lead_id']);
        });
    }

    public function down(): void
    {
        Schema::table('bot_notifications', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'lead_id']);
            $table->dropColumn('lead_id');
        });
    }
};
