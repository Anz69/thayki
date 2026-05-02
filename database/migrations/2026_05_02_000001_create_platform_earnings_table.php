<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_earnings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('meeting_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('model_profile_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // gross = full payment amount in minor units (cents/satang).
            $table->bigInteger('gross_minor');
            // commission rate at the moment of confirmation, fraction in [0, 1].
            $table->decimal('commission_rate', 6, 4);
            // gross * rate, snapshot. Never recomputed when rate changes later.
            $table->bigInteger('commission_minor');
            // amount actually credited to the model wallet (gross - commission).
            $table->bigInteger('net_minor');
            // 'default' (global rate) or 'model_override' (per-profile override).
            $table->string('source', 32)->default('default');
            $table->timestamp('confirmed_at');
            $table->timestamps();

            $table->index('confirmed_at');
            $table->index(['model_profile_id', 'confirmed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_earnings');
    }
};
