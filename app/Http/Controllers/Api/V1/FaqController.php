<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FaqItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FaqController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $raw = strtolower((string) $request->query('lang', 'ru'));
        $lang = str_starts_with($raw, 'zh') ? 'zh' : (str_starts_with($raw, 'en') ? 'en' : 'ru');

        // Per-language fallback chain: zh → en → ru; en → ru; ru → ru.
        $pick = static function (FaqItem $i, string $field) use ($lang): string {
            if ($lang === 'zh') {
                return (string) ($i->{$field.'_zh'} ?: $i->{$field.'_en'} ?: $i->{$field});
            }
            if ($lang === 'en') {
                return (string) ($i->{$field.'_en'} ?: $i->{$field});
            }

            return (string) $i->{$field};
        };

        $items = Cache::remember("faq_items_active_{$lang}", 300, function () use ($pick) {
            return FaqItem::where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (FaqItem $i) => [
                    'id' => $i->id,
                    'question' => $pick($i, 'question'),
                    'answer' => $pick($i, 'answer'),
                ])
                ->toArray();
        });

        return response()->json(['data' => $items]);
    }
}
