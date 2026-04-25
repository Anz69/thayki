<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('meeting_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('gateway', 32);
            $table->string('method', 16);
            $table->bigInteger('amount_minor');
            $table->string('currency', 3);
            $table->string('wallet_address', 255)->nullable();
            $table->string('tx_hash', 255)->nullable();
            $table->string('status', 16)->default('pending');
            $table->timestamp('confirmed_at')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->unique(['gateway', 'tx_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
