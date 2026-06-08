<?php

declare(strict_types=1);

namespace App\Services\Catalog;

use App\Models\ModelProfile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Applies validated filters and sorts to the public model catalog query.
 *
 * @phpstan-type Filters array{
 *   schedule?: string,
 *   price_min?: int,
 *   price_max?: int,
 *   age_min?: int,
 *   age_max?: int,
 *   search?: string,
 *   sort?: string,
 *   page?: int,
 *   per_page?: int,
 * }
 */
class ModelProfileQuery
{
    /**
     * @param  Filters  $filters
     * @return LengthAwarePaginator<int, ModelProfile>
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = ModelProfile::query()->published();

        $this->applyFilters($query, $filters);
        $this->applySort($query, $filters['sort'] ?? '-newest');

        $query->with(['photos', 'priceOptions']);

        $perPage = min(100, max(1, (int) ($filters['per_page'] ?? 20)));

        return $query->paginate($perPage, ['*'], 'page', (int) ($filters['page'] ?? 1));
    }

    /**
     * @param  Builder<ModelProfile>  $query
     * @param  Filters  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (isset($filters['schedule'])) {
            $query->where('schedule', $filters['schedule']);
        }
        if (isset($filters['price_min'])) {
            $query->where('hourly_rate_thb', '>=', (int) $filters['price_min']);
        }
        if (isset($filters['price_max'])) {
            $query->where('hourly_rate_thb', '<=', (int) $filters['price_max']);
        }
        if (isset($filters['age_min'])) {
            $query->where('age', '>=', (int) $filters['age_min']);
        }
        if (isset($filters['age_max'])) {
            $query->where('age', '<=', (int) $filters['age_max']);
        }
        if (isset($filters['search']) && $filters['search'] !== '') {
            $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $filters['search']).'%';
            $query->where(function (Builder $q) use ($needle): void {
                $q->where('display_name', 'like', $needle)
                    ->orWhere('description', 'like', $needle);
            });
        }
    }

    /**
     * @param  Builder<ModelProfile>  $query
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price' => $query->orderBy('hourly_rate_thb'),
            '-price' => $query->orderByDesc('hourly_rate_thb'),
            'age' => $query->orderBy('age'),
            '-age' => $query->orderByDesc('age'),
            'name' => $query->orderBy('display_name'),
            '-name' => $query->orderByDesc('display_name'),
            'newest' => $query->orderBy('published_at'),
            default => $query->orderByDesc('published_at'),
        };

        // Alphabetical sort: tie-break by name then id for a stable order.
        if ($sort === 'name' || $sort === '-name') {
            $query->orderBy('id');
        } else {
            $query->orderByDesc('id');
        }
    }
}
