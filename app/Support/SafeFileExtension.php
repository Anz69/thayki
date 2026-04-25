<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\UploadedFile;

/**
 * Derives a *safe* file extension from the real (sniffed) MIME type of an
 * uploaded file. The extension reported by the client is **never** trusted —
 * it can be tampered with trivially and is the source of countless
 * file-upload exploits.
 *
 * Usage:
 *   $ext = SafeFileExtension::forImage($file);            // throws if mime !⊆ image whitelist
 *   $ext = SafeFileExtension::forChatAttachment($file);   // images + audio + pdf + mp4
 */
final class SafeFileExtension
{
    /**
     * Real MIME → canonical extension mapping for image uploads.
     *
     * @var array<string, string>
     */
    private const IMAGE_MIME_MAP = [
        'image/jpeg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    /**
     * Extra mime types allowed for chat attachments on top of images.
     *
     * @var array<string, string>
     */
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

    /**
     * Return a safe extension for an image upload.
     */
    public static function forImage(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        if (! isset(self::IMAGE_MIME_MAP[$mime])) {
            throw new \RuntimeException('Unsupported image type: '.$mime);
        }

        return self::IMAGE_MIME_MAP[$mime];
    }

    /**
     * Return a safe extension for a chat attachment.
     */
    public static function forChatAttachment(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        $map  = self::IMAGE_MIME_MAP + self::CHAT_EXTRA_MIME_MAP;
        if (! isset($map[$mime])) {
            throw new \RuntimeException('Unsupported attachment type: '.$mime);
        }

        return $map[$mime];
    }

    /**
     * Whether the file's *real* mime type matches the image whitelist.
     */
    public static function isImage(UploadedFile $file): bool
    {
        return isset(self::IMAGE_MIME_MAP[(string) $file->getMimeType()]);
    }
}
