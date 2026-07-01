<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TemplateCategory extends Model
{
    protected $guarded = ['id'];

    public function templates(): HasMany
    {
        return $this->hasMany(MessageTemplate::class, 'category_id');
    }
}
