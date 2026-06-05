<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Client "подбор модели" requests (leads). Each lead spawns a Lead-type chat
 * where a manager follows up with the client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('model_profile_id')->nullable()->nullOnDelete()->constrained();
            $table->string('city');
            $table->string('hair_type')->nullable();
            $table->string('age_range')->nullable();
            $table->string('height_range')->nullable();
            $table->string('goal')->nullable();
            $table->text('wishes')->nullable();
            $table->string('status', 16)->default('new');
            $table->foreignId('chat_id')->nullable()->nullOnDelete()->constrained();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
