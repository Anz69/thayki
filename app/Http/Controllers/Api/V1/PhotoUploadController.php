<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\HeicImageHandler;
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
        $request->validate(
            [
                'photo' => ['required', 'file', 'max:10240'],
            ],
            [
                'photo.max' => 'Файл больше 10 МБ. Сожмите фото или выберите другое.',
            ],
        );

        $user = $request->user();

        $file = $request->file('photo');
        if ($file === null) {
            throw DomainException::invalid('INVALID_UPLOAD', 'Файл не получен.');
        }

        if (HeicImageHandler::isHeic($file)) {
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
        try {
            $jpeg = HeicImageHandler::toJpegBlob($file);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'imagick_missing') {
                throw DomainException::invalid(
                    'UNSUPPORTED_FILE',
                    'Формат HEIC требует конвертации. Обновите приложение или в настройках камеры iPhone выберите «Совместимые» (JPEG).',
                );
            }
            throw $e;
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
