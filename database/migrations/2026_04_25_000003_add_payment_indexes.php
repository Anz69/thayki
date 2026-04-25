<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds composite indexes that speed up the most common payment queries.
 *
 * Why these specific indexes
 * - (user_id, created_at): supports listing a user's payment history sorted
 *   by recency. `foreignId()->constrained()` only guarantees a single-column
 *   FK index on MySQL; PostgreSQL doesn't auto-index FKs at all, so this is
 *   needed for portability.
 * - (status, created_at): admin pages filter by status and order by recency;
 *   the existing single-column `status` index forces a follow-up sort.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->index(['user_id', 'created_at'], 'payments_user_id_created_at_index');
            $table->index(['status', 'created_at'], 'payments_status_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropIndex('payments_user_id_created_at_index');
            $table->dropIndex('payments_status_created_at_index');
        });
    }
};
