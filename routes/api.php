<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\FaqController;
use App\Http\Controllers\Api\V1\PhotoUploadController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\InviteController;
use App\Http\Controllers\Api\V1\MeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {

    Route::middleware('throttle:auth')->group(function (): void {
        Route::post('/auth/telegram', [AuthController::class, 'login'])->name('auth.telegram');
    });

    Route::middleware('throttle:api')->group(function (): void {
        Route::get('/catalog/models', [CatalogController::class, 'index'])->name('catalog.index');
        Route::get('/catalog/models/{id}', [CatalogController::class, 'show'])->name('catalog.show');
        Route::get('/catalog/models/{id}/booked-slots', [CatalogController::class, 'bookedSlots'])
            ->name('catalog.bookedSlots');
        Route::get('/faq', [FaqController::class, 'index'])->name('faq.index');
    });

    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {

        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        Route::post('/auth/write-access', [AuthController::class, 'writeAccessGranted'])->name('auth.write-access');

        Route::get('/geo/city', [\App\Http\Controllers\Api\V1\GeoController::class, 'city'])->name('geo.city');

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

        Route::post('/uploads/photo', [PhotoUploadController::class, 'store'])
            ->middleware('throttle:30,1')
            ->name('uploads.photo');

        Route::get('/chats', [ChatController::class, 'index'])->name('chats.index');
        Route::get('/chats/support', [ChatController::class, 'support'])->name('chats.support');
        Route::get('/chats/requisites', [ChatController::class, 'requisites'])
            ->middleware('role:manager,requisite')->name('chats.requisites');
        Route::get('/chats/{chat}/messages', [ChatController::class, 'messages'])->name('chats.messages');
        Route::post('/chats/{chat}/messages', [ChatController::class, 'postMessage'])
            ->middleware(['throttle:messages', 'idempotency'])
            ->name('chats.postMessage');
        Route::post('/chats/{chat}/read', [ChatController::class, 'markRead'])->name('chats.markRead');

        Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
        Route::post('/leads', [LeadController::class, 'store'])
            ->middleware('idempotency')
            ->name('leads.store');
        Route::delete('/leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
        Route::post('/leads/{lead}/verify-contact', [LeadController::class, 'verifyContact'])
            ->middleware('idempotency')
            ->name('leads.verifyContact');
        Route::get('/leads/{lead}/crypto-addresses', [LeadController::class, 'cryptoAddresses'])
            ->name('leads.cryptoAddresses');


        Route::post('/invites/share', [InviteController::class, 'share'])
            ->middleware(['throttle:10,1', 'idempotency'])
            ->name('invites.share');

        Route::middleware('role:manager')->prefix('manager')->group(function (): void {
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
