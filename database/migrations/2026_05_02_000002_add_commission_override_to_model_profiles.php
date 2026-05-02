<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('model_profiles', function (Blueprint $table): void {
            // Per-model commission override as a fraction in [0, 1].
            // NULL means "use the global default from app_settings.commission_default".
            $table->decimal('commission_override', 6, 4)
                ->nullable()
                ->after('hourly_rate_thb');
        });
    }

    public function down(): void
    {
        Schema::table('model_profiles', function (Blueprint $table): void {
            $table->dropColumn('commission_override');
        });
    }
};
