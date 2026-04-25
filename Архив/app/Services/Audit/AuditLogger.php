<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogger
{
    public function __construct(private readonly Request $request) {}

    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        string $action,
        ?User $user = null,
        ?Model $subject = null,
        array $context = [],
    ): AuditLog {
        $attrs = [
            'user_id' => $user?->id,
            'action' => $action,
            'subject_type' => $subject !== null ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'context' => $context !== [] ? $context : null,
            'ip' => $this->request->ip(),
            'user_agent' => substr((string) $this->request->userAgent(), 0, 500),
            'created_at' => now(),
        ];

        /** @var AuditLog $log */
        $log = AuditLog::query()->create($attrs);

        return $log;
    }
}
