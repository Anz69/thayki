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

            $table->bigInteger('gross_minor');

            $table->decimal('commission_rate', 6, 4);

            $table->bigInteger('commission_minor');

            $table->bigInteger('net_minor');

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
