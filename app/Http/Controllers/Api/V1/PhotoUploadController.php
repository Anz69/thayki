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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PhotoUploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            // mimes: enforced by *real* MIME (Laravel sniffs via finfo)
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $file = $request->file('photo');

        try {
            $ext = SafeFileExtension::forImage($file);
        } catch (\RuntimeException $e) {
            throw DomainException::invalid('UNSUPPORTED_FILE', 'Unsupported file type.');
        }

        $path = 'application-photos/' . $user->id . '/' . Str::uuid()->toString() . '.' . $ext;

        Storage::disk('public')->putFileAs(dirname($path), $file, basename($path), 'public');

        $url = Storage::disk('public')->url($path);

        return ApiResponse::ok(['url' => $url, 'path' => $path]);
    }
}
