<?php

declare(strict_types=1);

namespace App\Actions\Profile;

use App\Exceptions\DomainException;
use App\Jobs\ProcessUploadedMediaJob;
use App\Models\ModelPhoto;
use App\Models\ModelProfile;
use App\Support\HeicImageHandler;
use App\Support\SafeFileExtension;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadModelPhotoAction
{
    /**
     * Hard ceiling — matches the FE's MAX_PHOTOS so the FE-side "you've
     * hit the limit" message and the BE error code line up. Bumping
     * this means changing both this and `MAX_PHOTOS` in
     * resources/js/components/modals/ChangeMediaModal.jsx.
     */
    private const MAX_PHOTOS = 6;

    public function execute(ModelProfile $profile, UploadedFile $file, bool $makeMain = false): ModelPhoto
    {
        return DB::transaction(function () use ($profile, $file, $makeMain): ModelPhoto {
            $disk = 'public';

            $current = ModelPhoto::query()
                ->where('model_profile_id', $profile->id)
                ->lockForUpdate()
                ->count();

            if ($current >= self::MAX_PHOTOS) {
                throw DomainException::invalid(
                    'PHOTO_LIMIT_REACHED',
                    'Достигнут максимум фото ('.self::MAX_PHOTOS.'). Сначала удалите одно из существующих.',
                );
            }

            $path = 'model-photos/'.$profile->id.'/'.Str::uuid()->toString();

            if (HeicImageHandler::isHeic($file)) {
                try {
                    $jpeg = HeicImageHandler::toJpegBlob($file);
                } catch (\RuntimeException $e) {
                    if ($e->getMessage() === 'imagick_missing') {
                        throw DomainException::invalid(
                            'UNSUPPORTED_FILE',
                            'HEIC на сервере недоступен. Откройте приложение в актуальной версии или сохраните фото как JPEG.',
                        );
                    }
                    throw $e;
                } catch (\Throwable) {
                    throw DomainException::invalid(
                        'UNSUPPORTED_FILE',
                        'Не удалось обработать HEIC. Сохраните снимок как JPEG.',
                    );
                }
                $path .= '.jpg';
                try {
                    Storage::disk($disk)->put($path, $jpeg, 'public');
                } catch (\Throwable $e) {
                    Log::error('[UploadModelPhotoAction] HEIC storage put failed', [
                        'profile_id' => $profile->id,
                        'error'      => $e->getMessage(),
                    ]);
                    throw DomainException::invalid(
                        'PHOTO_STORAGE_FAILED',
                        'Не удалось сохранить фото. Попробуйте ещё раз.',
                    );
                }
            } else {
                try {
                    $ext = SafeFileExtension::forImage($file);
                } catch (\RuntimeException $e) {
                    throw DomainException::invalid('UNSUPPORTED_FILE', 'Неподдерживаемый формат фото.');
                }
                $path .= '.'.$ext;
                try {
                    Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path), 'public');
                } catch (\Throwable $e) {
                    Log::error('[UploadModelPhotoAction] storage put failed', [
                        'profile_id' => $profile->id,
                        'disk'       => $disk,
                        'error'      => $e->getMessage(),
                    ]);
                    throw DomainException::invalid(
                        'PHOTO_STORAGE_FAILED',
                        'Не удалось сохранить фото. Попробуйте ещё раз.',
                    );
                }
            }

            if (! Storage::disk($disk)->exists($path)) {
                throw DomainException::invalid(
                    'PHOTO_STORAGE_FAILED',
                    'Файл не удалось сохранить. Попробуйте ещё раз.',
                );
            }

            $position = (int) ModelPhoto::query()->where('model_profile_id', $profile->id)->max('position') + 1;

            if ($makeMain) {
                ModelPhoto::query()
                    ->where('model_profile_id', $profile->id)
                    ->update(['is_main' => false]);
            }

            /** @var ModelPhoto $photo */
            $photo = ModelPhoto::query()->create([
                'model_profile_id' => $profile->id,
                'disk' => $disk,
                'path' => $path,
                'position' => $position,
                'is_main' => $makeMain,
            ]);

            $profile->loadMissing('user');
            $user = $profile->user;
            if ($user !== null && ! $user->photo_customized) {
                $url = Storage::disk($disk)->url($path);
                $user->update(['photo_url' => $url, 'photo_customized' => true]);
            }

            try {
                ProcessUploadedMediaJob::dispatch($photo->id)->onQueue('media');
            } catch (\Throwable $e) {
                Log::warning('[UploadModelPhotoAction] media job dispatch failed', [
                    'photo_id' => $photo->id,
                    'error'    => $e->getMessage(),
                ]);
            }

            return $photo;
        });
    }
}
