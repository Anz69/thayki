<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_crypto_addresses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('message_id')->nullable()->index();
            $table->string('network');
            $table->string('address')->nullable();
            $table->string('memo')->nullable();
            $table->string('track_id')->nullable()->index();
            $table->string('status')->default('pending');
            $table->string('paid_currency')->nullable();
            $table->decimal('paid_amount', 28, 10)->nullable();
            $table->string('paid_fiat_currency')->nullable();
            $table->decimal('paid_fiat_amount', 18, 2)->nullable();
            $table->string('tx_hash')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['lead_id', 'message_id', 'network']);
            $table->index(['lead_id', 'message_id']);
            $table->index('address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_crypto_addresses');
    }
};
