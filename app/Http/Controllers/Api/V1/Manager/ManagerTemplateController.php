<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use App\Models\TemplateCategory;
use App\Models\TemplateSubcategory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerTemplateController extends Controller
{
    // Templates are SHARED across all managers. Categories and subcategories are
    // created by the admin; managers add/edit/delete the templates inside them.
    public function index(Request $request): JsonResponse
    {
        $categories = TemplateCategory::query()
            ->with(['subcategories' => fn ($q) => $q
                ->orderBy('position')->orderBy('id')
                ->with(['templates' => fn ($t) => $t->orderBy('id')])])
            ->orderBy('position')->orderBy('id')
            ->get()
            ->map(fn (TemplateCategory $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'subcategories' => $c->subcategories->map(fn (TemplateSubcategory $s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'templates' => $s->templates->map(fn (MessageTemplate $t) => [
                        'id' => $t->id,
                        'body' => $t->body,
                    ])->values()->all(),
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return ApiResponse::ok(['categories' => $categories]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'subcategory_id' => ['required', 'integer', 'exists:template_subcategories,id'],
        ]);

        $subcategory = TemplateSubcategory::query()->findOrFail((int) $data['subcategory_id']);

        $template = MessageTemplate::query()->create([
            'user_id' => $request->user()->id,
            'category_id' => $subcategory->category_id,
            'subcategory_id' => $subcategory->id,
            'body' => trim($data['body']),
        ]);

        return ApiResponse::created([
            'id' => $template->id,
            'body' => $template->body,
            'category_id' => $template->category_id,
            'subcategory_id' => $template->subcategory_id,
        ]);
    }

    public function update(Request $request, MessageTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'subcategory_id' => ['sometimes', 'integer', 'exists:template_subcategories,id'],
        ]);

        $template->body = trim($data['body']);
        if (isset($data['subcategory_id'])) {
            $subcategory = TemplateSubcategory::query()->findOrFail((int) $data['subcategory_id']);
            $template->category_id = $subcategory->category_id;
            $template->subcategory_id = $subcategory->id;
        }
        $template->save();

        return ApiResponse::ok([
            'id' => $template->id,
            'body' => $template->body,
            'category_id' => $template->category_id,
            'subcategory_id' => $template->subcategory_id,
        ]);
    }

    public function destroy(Request $request, MessageTemplate $template): JsonResponse
    {
        $template->delete();

        return ApiResponse::noContent();
    }
}
