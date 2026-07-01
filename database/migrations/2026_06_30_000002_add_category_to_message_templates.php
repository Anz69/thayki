<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_templates', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable()->after('id')
                ->constrained('template_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('message_templates', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('category_id');
        });
    }
};
