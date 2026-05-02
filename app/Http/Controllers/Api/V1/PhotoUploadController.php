<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\SafeFileExtension;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PhotoUploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'file', 'max:10240'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $file = $request->file('photo');
        if ($file === null) {
            throw DomainException::invalid('INVALID_UPLOAD', 'Файл не получен.');
        }

        $mime = (string) $file->getMimeType();

        if (in_array($mime, ['image/heic', 'image/heif'], true)) {
            return $this->storeHeicAsJpeg($user, $file);
        }

        try {
            $ext = SafeFileExtension::forImage($file);
        } catch (\RuntimeException) {
            throw DomainException::invalid(
                'UNSUPPORTED_FILE',
                'Поддерживаются JPEG, PNG и WebP.',
            );
        }

        $path = 'application-photos/'.$user->id.'/'.Str::uuid()->toString().'.'.$ext;

        Storage::disk('public')->putFileAs(dirname($path), $file, basename($path), 'public');

        $url = Storage::disk('public')->url($path);

        return ApiResponse::ok(['url' => $url, 'path' => $path]);
    }

    private function storeHeicAsJpeg(User $user, UploadedFile $file): JsonResponse
    {
        if (! class_exists(\Imagick::class)) {
            throw DomainException::invalid(
                'UNSUPPORTED_FILE',
                'Формат HEIC не поддерживается на сервере. В Настройках → Камера выберите «Наиболее совместимые» или экспортируйте фото как JPEG.',
            );
        }

        try {
            $im = new \Imagick;
            $im->readImageBlob((string) file_get_contents($file->getRealPath()));
            $im->setImageFormat('jpeg');
            $jpeg = $im->getImageBlob();
        } catch (\Throwable) {
            throw DomainException::invalid(
                'UNSUPPORTED_FILE',
                'Не удалось обработать HEIC. Сохраните фото как JPEG и загрузите снова.',
            );
        }

        $path = 'application-photos/'.$user->id.'/'.Str::uuid()->toString().'.jpg';
        Storage::disk('public')->put($path, $jpeg, 'public');
        $url = Storage::disk('public')->url($path);

        return ApiResponse::ok(['url' => $url, 'path' => $path]);
    }
}
