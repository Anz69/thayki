<?php

declare(strict_types=1);

namespace App\Actions\ModelApplication;

use App\Enums\ModelApplicationStatus;
use App\Enums\UserRole;
use App\Exceptions\DomainException;
use App\Models\AppSetting;
use App\Models\ModelApplication;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class SubmitModelApplicationAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ApproveModelApplicationAction $approveAction,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function execute(User $user, array $payload): ModelApplication
    {
        if ($user->role === UserRole::Admin) {
            throw DomainException::forbidden('APPLICATION_NOT_ALLOWED', 'Admins cannot submit model applications.');
        }

        $existing = ModelApplication::query()
            ->where('user_id', $user->id)
            ->first();

        if ($existing !== null) {
            throw DomainException::conflict(
                'APPLICATION_ALREADY_SUBMITTED',
                'Вы уже отправили заявку на модель. Повторная отправка недоступна.',
            );
        }

        $application = DB::transaction(function () use ($user, $payload): ModelApplication {
            /** @var ModelApplication $application */
            $application = ModelApplication::query()->create([
                'user_id' => $user->id,
                'payload' => $payload,
                'status' => ModelApplicationStatus::Submitted,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'review_note' => null,
            ]);

            $this->audit->log('model_application.submitted', $user, $application, [
                'application_id' => $application->id,
            ]);

            return $application;
        });

        if (AppSetting::bool('auto_approve_applications', false)) {
            $application = $this->approveAction->execute($application);
        }

        return $application;
    }
}
