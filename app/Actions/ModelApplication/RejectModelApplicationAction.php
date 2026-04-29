<?php

declare(strict_types=1);

namespace App\Actions\ModelApplication;

use App\Enums\ModelApplicationStatus;
use App\Exceptions\DomainException;
use App\Models\ModelApplication;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\DB;

class RejectModelApplicationAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly Notifier $notifier,
    ) {}

    public function execute(ModelApplication $application, ?User $reviewer = null, ?string $note = null): ModelApplication
    {
        if ($application->status !== ModelApplicationStatus::Submitted) {
            throw DomainException::conflict('APPLICATION_NOT_SUBMITTED', 'Only submitted applications can be rejected.');
        }

        $application = DB::transaction(function () use ($application, $reviewer, $note): ModelApplication {
            $application->update([
                'status' => ModelApplicationStatus::Rejected,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => now(),
                'review_note' => $note,
            ]);

            $this->audit->log('model_application.rejected', $reviewer, $application, [
                'note' => $note,
            ]);

            return $application->refresh();
        });

        $user = $application->user;
        if ($user !== null) {
            $message = "❌ Заявка модели отклонена.";
            if ($application->review_note !== null && $application->review_note !== '') {
                $message .= "\nПричина: {$application->review_note}";
            }

            $this->notifier->notifyUser(
                $user,
                $message,
                '/home',
                'На главную',
            );
        }

        $this->notifier->notifyAdmins(
            "❌ Заявка модели #{$application->id} отклонена.",
            '/admin/model-applications',
            'Открыть в админке',
        );

        return $application;
    }
}
