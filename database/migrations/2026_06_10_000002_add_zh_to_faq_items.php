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
            $table->string('question_zh')->nullable()->after('question_en');
            $table->text('answer_zh')->nullable()->after('answer_en');
        });
    }

    public function down(): void
    {
        Schema::table('faq_items', function (Blueprint $table): void {
            $table->dropColumn(['question_zh', 'answer_zh']);
        });
    }
};
