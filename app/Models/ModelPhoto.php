<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModelPhotoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ModelPhoto extends Model
{

    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_main' => 'boolean',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    public function modelProfile(): BelongsTo
    {
        return $this->belongsTo(ModelProfile::class);
    }

    public function getUrl(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }
}
