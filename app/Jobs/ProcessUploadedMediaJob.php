<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ModelPhoto;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\ImageManager;

class ProcessUploadedMediaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public readonly int $photoId)
    {
        $this->onQueue('media');
    }

    public function handle(): void
    {
        /** @var ModelPhoto|null $photo */
        $photo = ModelPhoto::query()->find($this->photoId);
        if ($photo === null) {
            return;
        }

        $disk = Storage::disk($photo->disk);
        if (! $disk->exists($photo->path)) {
            return;
        }

        try {
            $binary = $disk->get($photo->path);
            if ($binary === null) {
                return;
            }

            $manager = ImageManager::usingDriver(new GdDriver());
            $image   = $manager->read($binary);

            $maxWidth = 1440;
            if ($image->width() > $maxWidth) {
                $image->scaleDown(width: $maxWidth);
            }

            $encoded = (string) $image->toWebp(quality: 85);

            $newPath = preg_replace('/\.[^.]+$/', '.webp', $photo->path) ?? $photo->path.'.webp';
            $disk->put($newPath, $encoded, 'public');

            if ($newPath !== $photo->path && $disk->exists($photo->path)) {
                $disk->delete($photo->path);
            }

            $photo->update([
                'path' => $newPath,
                'width' => $image->width(),
                'height' => $image->height(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('ProcessUploadedMediaJob failed', [
                'photo_id' => $photo->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
