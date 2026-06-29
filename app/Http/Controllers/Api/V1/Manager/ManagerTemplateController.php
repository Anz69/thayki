<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = MessageTemplate::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('id')
            ->get(['id', 'body'])
            ->all();

        return ApiResponse::ok($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $template = MessageTemplate::query()->create([
            'user_id' => $request->user()->id,
            'body' => trim($data['body']),
        ]);

        return ApiResponse::created(['id' => $template->id, 'body' => $template->body]);
    }

    public function update(Request $request, MessageTemplate $template): JsonResponse
    {
        $this->authorizeOwner($request, $template);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $template->update(['body' => trim($data['body'])]);

        return ApiResponse::ok(['id' => $template->id, 'body' => $template->body]);
    }

    public function destroy(Request $request, MessageTemplate $template): JsonResponse
    {
        $this->authorizeOwner($request, $template);

        $template->delete();

        return ApiResponse::noContent();
    }

    private function authorizeOwner(Request $request, MessageTemplate $template): void
    {
        if ((int) $template->user_id !== (int) $request->user()->id) {
            throw DomainException::forbidden('TEMPLATE_FORBIDDEN', 'Not your template.');
        }
    }
}
