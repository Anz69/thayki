<?php

declare(strict_types=1);

namespace App\Actions\Profile;

use App\Exceptions\DomainException;
use App\Models\User;
use App\Support\SafeFileExtension;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadAvatarAction
{
    public function execute(User $user, UploadedFile $file): User
    {
        $disk = 'public';

        try {
            $ext = SafeFileExtension::forImage($file);
        } catch (\RuntimeException $e) {
            throw DomainException::invalid('UNSUPPORTED_FILE', 'Unsupported avatar format.');
        }

        $path = 'avatars/'.$user->id.'/'.Str::uuid()->toString().'.'.$ext;

        if ($user->photo_customized && $user->photo_url) {
            $oldPath = $this->extractLocalPath($user->photo_url);
            if ($oldPath && Storage::disk($disk)->exists($oldPath)) {
                Storage::disk($disk)->delete($oldPath);
            }
        }

        Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path), 'public');

        /** @var \Illuminate\Filesystem\FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        $user->update([
            'photo_url'        => $storage->url($path),
            'photo_customized' => true,
        ]);

        return $user;
    }

    private function extractLocalPath(string $url): ?string
    {
        $prefix = '/storage/';
        $pos    = strpos($url, $prefix);
        if ($pos === false) {
            return null;
        }

        return substr($url, $pos + strlen($prefix));
    }
}
