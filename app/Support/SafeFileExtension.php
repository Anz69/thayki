<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\UploadedFile;

final class SafeFileExtension
{

    private const IMAGE_MIME_MAP = [
        'image/jpeg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    private const CHAT_EXTRA_MIME_MAP = [
        'application/pdf' => 'pdf',
        'video/mp4'       => 'mp4',
        'audio/mpeg'      => 'mp3',
        'audio/mp3'       => 'mp3',
        'audio/ogg'       => 'ogg',
        'audio/wav'       => 'wav',
        'audio/x-wav'     => 'wav',
        'audio/wave'      => 'wav',
    ];

    public static function forImage(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        if (! isset(self::IMAGE_MIME_MAP[$mime])) {
            throw new \RuntimeException('Unsupported image type: '.$mime);
        }

        return self::IMAGE_MIME_MAP[$mime];
    }

    public static function forChatAttachment(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        $map  = self::IMAGE_MIME_MAP + self::CHAT_EXTRA_MIME_MAP;
        if (! isset($map[$mime])) {
            throw new \RuntimeException('Unsupported attachment type: '.$mime);
        }

        return $map[$mime];
    }

    public static function isImage(UploadedFile $file): bool
    {
        return isset(self::IMAGE_MIME_MAP[(string) $file->getMimeType()]);
    }
}
