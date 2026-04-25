<?php

declare(strict_types=1);

namespace App\Actions\Profile;

use App\Jobs\ProcessUploadedMediaJob;
use App\Models\ModelPhoto;
use App\Models\ModelProfile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadModelPhotoAction
{
    public function execute(ModelProfile $profile, UploadedFile $file, bool $makeMain = false): ModelPhoto
    {
        return DB::transaction(function () use ($profile, $file, $makeMain): ModelPhoto {
            $disk = (string) config('filesystems.default', 'public');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $path = 'model-photos/'.$profile->id.'/'.Str::uuid()->toString().'.'.$ext;

            Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path), 'public');

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

            ProcessUploadedMediaJob::dispatch($photo->id)->onQueue('media');

            return $photo;
        });
    }
}
