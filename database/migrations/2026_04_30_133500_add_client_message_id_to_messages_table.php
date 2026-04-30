<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->string('client_message_id', 100)->nullable()->after('body');
            $table->index(['chat_id', 'client_message_id']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex(['chat_id', 'client_message_id']);
            $table->dropColumn('client_message_id');
        });
    }
};
