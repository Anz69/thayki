<?php

declare(strict_types=1);

namespace App\Actions\Profile;

use App\Exceptions\DomainException;
use App\Jobs\ProcessUploadedMediaJob;
use App\Models\ModelPhoto;
use App\Models\ModelProfile;
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

            try {
                $ext = SafeFileExtension::forImage($file);
            } catch (\RuntimeException $e) {
                throw DomainException::invalid('UNSUPPORTED_FILE', 'Неподдерживаемый формат фото.');
            }

            // Lock the photo set for this profile and re-count under the
            // lock so two parallel uploads can't both squeeze past the
            // MAX_PHOTOS cap (one would otherwise create the 7th row).
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

            $path = 'model-photos/'.$profile->id.'/'.Str::uuid()->toString().'.'.$ext;

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

            // putFileAs can return a path even if the underlying write
            // silently failed on some filesystems (FTP / network volumes).
            // Verify before we commit a DB row that points to a missing file.
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

            // Best-effort post-processing — failure here must not undo
            // the upload, so we swallow & log instead of bubbling up.
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
