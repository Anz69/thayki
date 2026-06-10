<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RoadmapStatus;
use Database\Factories\RoadmapItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoadmapItem extends Model
{

    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => RoadmapStatus::class,
            'position' => 'integer',
        ];
    }
}
