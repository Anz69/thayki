<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->unsignedSmallInteger('age_from')->nullable()->after('age_range');
            $table->unsignedSmallInteger('age_to')->nullable()->after('age_from');
            $table->unsignedSmallInteger('height_from')->nullable()->after('height_range');
            $table->unsignedSmallInteger('height_to')->nullable()->after('height_from');
            $table->string('bust_type', 16)->nullable()->after('height_to');
            $table->string('bust_size', 8)->nullable()->after('bust_type');
            $table->unsignedSmallInteger('weight_from')->nullable()->after('bust_size');
            $table->unsignedSmallInteger('weight_to')->nullable()->after('weight_from');
            $table->string('figure', 24)->nullable()->after('weight_to');
            $table->string('event_type', 16)->nullable()->after('goal');
            $table->unsignedSmallInteger('event_hours_from')->nullable()->after('event_type');
            $table->unsignedSmallInteger('event_hours_to')->nullable()->after('event_hours_from');
            $table->unsignedSmallInteger('trip_days_from')->nullable()->after('event_hours_to');
            $table->unsignedSmallInteger('trip_days_to')->nullable()->after('trip_days_from');
            $table->string('trip_city')->nullable()->after('trip_days_to');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn([
                'age_from', 'age_to', 'height_from', 'height_to',
                'bust_type', 'bust_size', 'weight_from', 'weight_to', 'figure',
                'event_type', 'event_hours_from', 'event_hours_to',
                'trip_days_from', 'trip_days_to', 'trip_city',
            ]);
        });
    }
};
