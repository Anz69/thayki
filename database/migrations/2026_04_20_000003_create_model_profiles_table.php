<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('model_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name');
            $table->unsignedTinyInteger('age');
            $table->unsignedSmallInteger('height_cm');
            $table->unsignedSmallInteger('weight_kg');
            $table->string('bust_size', 16);
            $table->string('butt_size', 16);
            $table->text('description')->nullable();
            $table->string('schedule', 16)->default('any');
            $table->unsignedInteger('hourly_rate_thb');
            $table->boolean('is_published')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['is_published', 'is_verified', 'schedule']);
            $table->index(['is_published', 'hourly_rate_thb']);
        });

        Schema::create('model_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('model_profile_id')->constrained()->cascadeOnDelete();
            $table->string('disk', 32)->default('public');
            $table->string('path');
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_main')->default(false);
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->timestamps();

            $table->index(['model_profile_id', 'position']);
        });

        Schema::create('model_price_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('model_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('hours');
            $table->unsignedInteger('price_thb');
            $table->string('label', 64);
            $table->timestamps();

            $table->unique(['model_profile_id', 'hours']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_price_options');
        Schema::dropIfExists('model_photos');
        Schema::dropIfExists('model_profiles');
    }
};
