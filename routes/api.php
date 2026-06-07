<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin\AuditController;
use App\Http\Controllers\Api\V1\Admin\ModelApplicationAdminController;
use App\Http\Controllers\Api\V1\Admin\PaymentAdminController;
use App\Http\Controllers\Api\V1\Admin\RoadmapAdminController;
use App\Http\Controllers\Api\V1\Admin\WithdrawalAdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\FaqController;
use App\Http\Controllers\Api\V1\PhotoUploadController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\ComplaintController;
use App\Http\Controllers\Api\V1\InviteController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\MeetingController;
use App\Http\Controllers\Api\V1\ModelApplicationController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RoadmapController;
use App\Http\Controllers\Api\V1\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // ------------------------------------------------------------------------
    // Public
    // ------------------------------------------------------------------------
    Route::middleware('throttle:auth')->group(function (): void {
        Route::post('/auth/telegram', [AuthController::class, 'login'])->name('auth.telegram');
    });

    Route::middleware('throttle:api')->group(function (): void {
        Route::get('/catalog/models', [CatalogController::class, 'index'])->name('catalog.index');
        Route::get('/catalog/models/{id}', [CatalogController::class, 'show'])->name('catalog.show');
        Route::get('/catalog/models/{id}/booked-slots', [CatalogController::class, 'bookedSlots'])
            ->name('catalog.bookedSlots');
        Route::get('/roadmap', [RoadmapController::class, 'index'])->name('roadmap.index');
        Route::get('/faq', [FaqController::class, 'index'])->name('faq.index');
    });

    // ------------------------------------------------------------------------
    // Authenticated
    // ------------------------------------------------------------------------
    // `touch.last_seen` quietly bumps users.last_seen_at (throttled to 1/min)
    // so the chat header can render "была в сети: <relative>" with live data.
    Route::middleware(['auth:sanctum', 'throttle:api', 'touch.last_seen'])->group(function (): void {
        // Auth / session
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        // Me / profile
        Route::get('/me', [MeController::class, 'profile'])->name('me.profile');
        Route::patch('/me', [MeController::class, 'updateProfile'])->name('me.update');
        Route::get('/me/model-profile', [MeController::class, 'modelProfile'])->name('me.model-profile');
        Route::patch('/me/model-profile', [MeController::class, 'updateModelProfile'])->name('me.model-profile.update');
        Route::post('/me/avatar', [MeController::class, 'uploadAvatar'])
            ->middleware('idempotency')
            ->name('me.avatar.upload');
        Route::delete('/me/avatar', [MeController::class, 'deleteAvatar'])->name('me.avatar.delete');
        Route::post('/me/model-profile/photos', [MeController::class, 'uploadPhoto'])
            ->middleware('idempotency')
            ->name('me.model-profile.photos.upload');
        Route::delete('/me/model-profile/photos/{photoId}', [MeController::class, 'deletePhoto'])->name('me.model-profile.photos.delete');
        Route::post('/me/model-profile/photos/{photoId}/main', [MeController::class, 'setMainPhoto'])->name('me.model-profile.photos.main');

        // Photo upload (for model applications — no model profile required)
        Route::post('/uploads/photo', [PhotoUploadController::class, 'store'])
            ->middleware('throttle:30,1')
            ->name('uploads.photo');

        // Model application ("become a model")
        Route::get('/model-application', [ModelApplicationController::class, 'show'])->name('model-application.show');
        Route::post('/model-application', [ModelApplicationController::class, 'store'])
            ->middleware('idempotency')
            ->name('model-application.store');

        // Meetings
        Route::get('/meetings', [MeetingController::class, 'index'])->name('meetings.index');
        Route::get('/meetings/latest', [MeetingController::class, 'latest'])->name('meetings.latest');
        Route::post('/meetings', [MeetingController::class, 'store'])
            ->middleware('idempotency')
            ->name('meetings.store');
        Route::get('/meetings/{meeting}', [MeetingController::class, 'show'])->name('meetings.show');
        Route::middleware('throttle:meetings')->group(function (): void {
            Route::post('/meetings/{meeting}/accept', [MeetingController::class, 'accept'])->name('meetings.accept');
            Route::post('/meetings/{meeting}/reject', [MeetingController::class, 'reject'])->name('meetings.reject');
            Route::post('/meetings/{meeting}/cancel', [MeetingController::class, 'cancel'])->name('meetings.cancel');
            Route::post('/meetings/{meeting}/confirm', [MeetingController::class, 'confirm'])->name('meetings.confirm');
            Route::post('/meetings/{meeting}/complete', [MeetingController::class, 'complete'])->name('meetings.complete');
        });

        // Payments
        Route::middleware('throttle:payments')->group(function (): void {
            Route::post('/payments', [PaymentController::class, 'store'])
                ->middleware('idempotency')
                ->name('payments.store');
            Route::get('/payments/{payment}', [PaymentController::class, 'show'])->name('payments.show');
            Route::post('/payments/{payment}/submit', [PaymentController::class, 'submit'])
                ->middleware('idempotency')
                ->name('payments.submit');
        });

        // Chats
        Route::get('/chats', [ChatController::class, 'index'])->name('chats.index');
        Route::get('/chats/support', [ChatController::class, 'support'])->name('chats.support');
        Route::get('/chats/meetings/{meeting}', [ChatController::class, 'showForMeeting'])->name('chats.meeting');
        Route::get('/chats/{chat}/messages', [ChatController::class, 'messages'])->name('chats.messages');
        Route::post('/chats/{chat}/messages', [ChatController::class, 'postMessage'])
            ->middleware(['throttle:messages', 'idempotency'])
            ->name('chats.postMessage');
        Route::post('/chats/{chat}/read', [ChatController::class, 'markRead'])->name('chats.markRead');

        // Leads (подбор модели)
        Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
        Route::post('/leads', [LeadController::class, 'store'])
            ->middleware('idempotency')
            ->name('leads.store');
        Route::post('/leads/{lead}/verify-contact', [LeadController::class, 'verifyContact'])
            ->middleware('idempotency')
            ->name('leads.verifyContact');

        // Complaints (post-meeting feedback / abuse report)
        Route::get('/complaints',  [ComplaintController::class, 'index'])->name('complaints.index');
        Route::post('/complaints', [ComplaintController::class, 'store'])
            ->middleware('idempotency')
            ->name('complaints.store');

        // Share-an-invite: verified users mint a one-shot, 7-day deep-link
        // they can forward. Strange users are blocked inside the controller.
        Route::post('/invites/share', [InviteController::class, 'share'])
            ->middleware(['throttle:10,1', 'idempotency'])
            ->name('invites.share');

        // Wallet / withdrawals
        Route::get('/wallet', [WalletController::class, 'show'])->name('wallet.show');
        Route::get('/wallet/transactions', [WalletController::class, 'transactions'])->name('wallet.transactions');
        Route::get('/withdrawals', [WalletController::class, 'withdrawals'])->name('withdrawals.index');
        Route::get('/withdrawals/status', [WalletController::class, 'withdrawalStatus'])->name('withdrawals.status');
        Route::middleware('throttle:withdrawals')->group(function (): void {
            Route::post('/withdrawals', [WalletController::class, 'requestWithdrawal'])
                ->middleware('idempotency')
                ->name('withdrawals.store');
        });

        // --------------------------------------------------------------------
        // Admin
        // --------------------------------------------------------------------
        Route::middleware('role:admin')->prefix('admin')->group(function (): void {
            Route::get('/model-applications', [ModelApplicationAdminController::class, 'index'])->name('admin.applications.index');
            Route::post('/model-applications/{application}/approve', [ModelApplicationAdminController::class, 'approve'])->name('admin.applications.approve');
            Route::post('/model-applications/{application}/reject', [ModelApplicationAdminController::class, 'reject'])->name('admin.applications.reject');

            Route::get('/payments', [PaymentAdminController::class, 'index'])->name('admin.payments.index');
            Route::post('/payments/{payment}/confirm', [PaymentAdminController::class, 'confirm'])->name('admin.payments.confirm');

            Route::get('/withdrawals', [WithdrawalAdminController::class, 'index'])->name('admin.withdrawals.index');
            Route::post('/withdrawals/{withdrawal}/approve', [WithdrawalAdminController::class, 'approve'])->name('admin.withdrawals.approve');
            Route::post('/withdrawals/{withdrawal}/mark-paid', [WithdrawalAdminController::class, 'markPaid'])->name('admin.withdrawals.markPaid');
            Route::post('/withdrawals/{withdrawal}/reject', [WithdrawalAdminController::class, 'reject'])->name('admin.withdrawals.reject');

            Route::post('/roadmap', [RoadmapAdminController::class, 'store'])->name('admin.roadmap.store');
            Route::patch('/roadmap/{item}', [RoadmapAdminController::class, 'update'])->name('admin.roadmap.update');
            Route::delete('/roadmap/{item}', [RoadmapAdminController::class, 'destroy'])->name('admin.roadmap.destroy');

            Route::get('/audit', [AuditController::class, 'index'])->name('admin.audit.index');
        });

        // --------------------------------------------------------------------
        // Manager panel (in-app). Admins may use it too.
        // --------------------------------------------------------------------
        Route::middleware('role:manager,admin')->prefix('manager')->group(function (): void {
            Route::get('/leads', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'index'])->name('manager.leads.index');
            Route::get('/leads/{lead}', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'show'])->name('manager.leads.show');
            Route::post('/leads/{lead}/accept', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'accept'])
                ->middleware('idempotency')->name('manager.leads.accept');
            Route::patch('/leads/{lead}/status', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'updateStatus'])->name('manager.leads.status');
            Route::post('/leads/{lead}/payment-request', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'paymentRequest'])->name('manager.leads.paymentRequest');
            Route::post('/leads/{lead}/payment-confirm', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'paymentConfirm'])
                ->middleware('idempotency')->name('manager.leads.paymentConfirm');
            Route::post('/leads/{lead}/verification-request', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'verificationRequest'])->name('manager.leads.verificationRequest');
            Route::post('/leads/{lead}/send-models', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'sendModels'])->name('manager.leads.sendModels');
            Route::post('/leads/{lead}/parse-model', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'parseModel'])->name('manager.leads.parseModel');
            Route::post('/leads/{lead}/send-parsed', [\App\Http\Controllers\Api\V1\Manager\ManagerLeadController::class, 'sendParsed'])->name('manager.leads.sendParsed');
            Route::get('/support', [\App\Http\Controllers\Api\V1\Manager\ManagerSupportController::class, 'index'])->name('manager.support.index');
            Route::get('/earnings', [\App\Http\Controllers\Api\V1\Manager\ManagerStatsController::class, 'earnings'])->name('manager.earnings');
        });
    });
});
