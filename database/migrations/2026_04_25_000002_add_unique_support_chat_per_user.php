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
            $table->index(['chat_id', 'sender_id'], 'messages_chat_sender_idx');
            $table->index(['chat_id', 'read_at'], 'messages_chat_read_idx');
        });

        Schema::table('chat_participants', function (Blueprint $table): void {
            $table->index(['user_id', 'last_read_at'], 'participants_user_read_idx');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex('messages_chat_sender_idx');
            $table->dropIndex('messages_chat_read_idx');
        });

        Schema::table('chat_participants', function (Blueprint $table): void {
            $table->dropIndex('participants_user_read_idx');
        });
    }
};
