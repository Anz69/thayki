<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Profile\UploadAvatarAction;
use App\Actions\Profile\UploadModelPhotoAction;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateModelProfileRequest;
use App\Http\Requests\Profile\UpdateMyProfileRequest;
use App\Http\Requests\Profile\UploadAvatarRequest;
use App\Http\Requests\Profile\UploadModelPhotoRequest;
use App\Http\Resources\ModelPhotoResource;
use App\Http\Resources\ModelProfileResource;
use App\Http\Resources\UserResource;
use App\Models\ModelPhoto;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MeController extends Controller
{
    public function profile(Request $request): JsonResponse
    {

        $user = $request->user();

        return ApiResponse::ok(new UserResource($user));
    }

    public function updateProfile(UpdateMyProfileRequest $request): JsonResponse
    {

        $user = $request->user();
        $data = $request->validated();
        // language_chosen is set ONLY when the client sends it explicitly (the in-app
        // language switcher / bot language buttons) — NOT derived from a language_code
        // sync. Otherwise the automatic app-side language sync would mark a brand-new
        // client as "already chose", and the bot would skip the language prompt.
        $user->fill($data)->save();

        return ApiResponse::ok(new UserResource($user));
    }

    // Verify the user by their shared Telegram contact (used before creating a lead in
    // the "select model" flow). Sets phone_verified_at.
    public function verifyContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:32'],
        ]);

        $user = $request->user();
        $user->forceFill([
            'phone_number' => preg_replace('/[^0-9+]/', '', $data['phone_number']),
            'phone_verified_at' => $user->phone_verified_at ?? now(),
        ])->save();

        return ApiResponse::ok(new UserResource($user->fresh()));
    }

    public function modelProfile(Request $request): JsonResponse
    {

        $user = $request->user();
        $profile = $user->modelProfile()->with(['photos', 'priceOptions'])->first();

        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        return ApiResponse::ok(new ModelProfileResource($profile));
    }

    public function updateModelProfile(UpdateModelProfileRequest $request): JsonResponse
    {

        $user = $request->user();
        $profile = $user->modelProfile()->first();

        if ($profile === null) {
            throw DomainException::invalid('MODEL_PROFILE_MISSING', 'Model profile is not initialized. Submit an application first.');
        }

        $validated = $request->validated();
        $profile->fill(\Illuminate\Support\Arr::except($validated, ['price_options']))->save();

        if ($request->has('display_name')) {
            $user->update(['first_name' => $request->input('display_name')]);
        }

        if ($request->has('price_options')) {
            $profile->priceOptions()->delete();
            foreach ($validated['price_options'] as $opt) {
                $profile->priceOptions()->create([
                    'hours'     => (int) $opt['hours'],
                    'price_thb' => (int) $opt['price_thb'],
                    'label'     => $opt['label'] ?? null,
                ]);
            }
        }

        return ApiResponse::ok(new ModelProfileResource($profile->fresh(['photos', 'priceOptions'])));
    }

    public function uploadAvatar(UploadAvatarRequest $request, UploadAvatarAction $action): JsonResponse
    {

        $user = $request->user();
        $updated = $action->execute($user, $request->file('photo'));

        return ApiResponse::ok(new UserResource($updated));
    }

    public function deleteAvatar(Request $request): JsonResponse
    {

        $user = $request->user();
        $user->update(['photo_customized' => false]);

        return ApiResponse::ok(new UserResource($user->fresh()));
    }

    public function uploadPhoto(UploadModelPhotoRequest $request, UploadModelPhotoAction $action): JsonResponse
    {

        $user = $request->user();
        $profile = $user->modelProfile()->first();

        if ($profile === null) {
            throw DomainException::invalid('MODEL_PROFILE_MISSING', 'Model profile is not initialized.');
        }

        $photo = $action->execute(
            $profile,
            $request->file('photo'),
            (bool) $request->boolean('is_main'),
        );

        return ApiResponse::created(new ModelPhotoResource($photo));
    }

    public function deletePhoto(Request $request, int $photoId): JsonResponse
    {

        $user = $request->user();
        $profile = $user->modelProfile()->first();
        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        $photo = ModelPhoto::query()
            ->where('model_profile_id', $profile->id)
            ->where('id', $photoId)
            ->first();

        if ($photo === null) {
            throw new NotFoundHttpException;
        }

        $photo->delete();

        return ApiResponse::noContent();
    }

    public function setMainPhoto(Request $request, int $photoId): JsonResponse
    {

        $user = $request->user();
        $profile = $user->modelProfile()->first();
        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        $photo = ModelPhoto::query()
            ->where('model_profile_id', $profile->id)
            ->where('id', $photoId)
            ->first();

        if ($photo === null) {
            throw new NotFoundHttpException;
        }

        ModelPhoto::query()
            ->where('model_profile_id', $profile->id)
            ->update(['is_main' => false]);
        $photo->update(['is_main' => true]);

        return ApiResponse::ok(new ModelPhotoResource($photo->fresh()));
    }
}
