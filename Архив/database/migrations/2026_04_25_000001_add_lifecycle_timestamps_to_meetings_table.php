<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meetings', function (Blueprint $table): void {
            $table->timestamp('confirmed_at')->nullable()->after('paid_at');
            $table->timestamp('cancelled_at')->nullable()->after('completed_at');
            $table->timestamp('closed_at')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table): void {
            $table->dropColumn(['confirmed_at', 'cancelled_at', 'closed_at']);
        });
    }
};
