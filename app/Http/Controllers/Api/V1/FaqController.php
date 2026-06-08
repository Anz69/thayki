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
        $lang = str_starts_with(strtolower((string) $request->query('lang', 'ru')), 'en') ? 'en' : 'ru';

        $items = Cache::remember("faq_items_active_{$lang}", 300, function () use ($lang) {
            return FaqItem::where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (FaqItem $i) => [
                    'id' => $i->id,
                    // EN where filled, otherwise fall back to the Russian text.
                    'question' => $lang === 'en' ? ($i->question_en ?: $i->question) : $i->question,
                    'answer' => $lang === 'en' ? ($i->answer_en ?: $i->answer) : $i->answer,
                ])
                ->toArray();
        });

        return response()->json(['data' => $items]);
    }
}
