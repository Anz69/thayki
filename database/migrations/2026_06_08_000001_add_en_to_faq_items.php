<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faq_items', function (Blueprint $table): void {
            $table->string('question_en')->nullable()->after('question');
            $table->text('answer_en')->nullable()->after('answer');
        });
    }

    public function down(): void
    {
        Schema::table('faq_items', function (Blueprint $table): void {
            $table->dropColumn(['question_en', 'answer_en']);
        });
    }
};
