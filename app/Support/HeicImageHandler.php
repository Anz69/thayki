<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\UploadedFile;

final class HeicImageHandler
{
    public static function isHeic(UploadedFile $file): bool
    {
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if (in_array($ext, ['heic', 'heif'], true)) {
            return true;
        }

        $mime = strtolower((string) $file->getMimeType());

        return in_array($mime, ['image/heic', 'image/heif'], true);
    }

    public static function toJpegBlob(UploadedFile $file): string
    {
        if (! class_exists(\Imagick::class)) {
            throw new \RuntimeException('imagick_missing');
        }

        $im = new \Imagick;
        $im->readImageBlob((string) file_get_contents($file->getRealPath()));
        $im->setImageFormat('jpeg');

        return $im->getImageBlob();
    }
}
