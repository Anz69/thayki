<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['key' => 'auto_approve_applications'],
            ['value' => 'false', 'updated_at' => now(), 'created_at' => now()],
        );
    }

    public function down(): void
    {
        // Intentionally no-op: this migration enforces a safe default.
    }
};

