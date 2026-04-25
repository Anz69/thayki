<?php

declare(strict_types=1);

namespace App\Actions\Profile;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadAvatarAction
{
    public function execute(User $user, UploadedFile $file): User
    {
        $disk = 'public';
        $ext  = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $path = 'avatars/'.$user->id.'/'.Str::uuid()->toString().'.'.$ext;

        // Remove old local avatar (if it was previously uploaded — not a TG URL)
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
        // Storage public URL pattern: /storage/avatars/...
        $prefix = '/storage/';
        $pos    = strpos($url, $prefix);
        if ($pos === false) {
            return null;
        }

        return substr($url, $pos + strlen($prefix));
    }
}
