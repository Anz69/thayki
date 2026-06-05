<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Static prototype profiles (lead model):
 *  - new display params (грудь/талия/бёдра обхваты, глаза, размер груди),
 *  - profiles may have no owner user and no price/schedule, so those become nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('model_profiles', function (Blueprint $table): void {
            $table->unsignedSmallInteger('bust_cm')->nullable()->after('height_cm');   // грудь (обхват)
            $table->unsignedSmallInteger('waist_cm')->nullable()->after('bust_cm');    // талия
            $table->unsignedSmallInteger('hips_cm')->nullable()->after('waist_cm');    // бёдра
            $table->string('eyes', 32)->nullable()->after('hips_cm');                  // цвет глаз
            $table->string('breast_size', 16)->nullable()->after('eyes');             // размер груди (чашка)
        });

        // Prototype profiles have no owner / price / schedule — relax old constraints.
        Schema::table('model_profiles', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->unsignedSmallInteger('weight_kg')->nullable()->change();
            $table->string('bust_size', 16)->nullable()->change();
            $table->string('butt_size', 16)->nullable()->change();
            $table->unsignedInteger('hourly_rate_thb')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('model_profiles', function (Blueprint $table): void {
            $table->dropColumn(['bust_cm', 'waist_cm', 'hips_cm', 'eyes', 'breast_size']);
        });
    }
};
