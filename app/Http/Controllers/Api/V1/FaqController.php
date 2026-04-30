<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FaqItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class FaqController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Cache::remember('faq_items_active', 300, function () {
            return FaqItem::where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'question', 'answer'])
                ->toArray();
        });

        return response()->json(['data' => $items]);
    }
}
