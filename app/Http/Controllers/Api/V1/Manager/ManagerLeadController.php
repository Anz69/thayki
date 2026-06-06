<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Actions\Lead\AcceptLeadAction;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerLeadController extends Controller
{
    /** All leads, optionally filtered by tab (new|active|closed|all). */
    public function index(Request $request): JsonResponse
    {
        $tab = (string) $request->query('tab', 'all');

        $query = Lead::query()->with(['user', 'manager', 'modelProfile.photos'])->latest();

        $query->when($tab === 'new', fn ($q) => $q->where('status', LeadStatus::New->value))
            ->when($tab === 'closed', fn ($q) => $q->whereIn('status', [LeadStatus::Closed->value, LeadStatus::Completed->value]))
            ->when($tab === 'active', fn ($q) => $q->whereNotIn('status', [
                LeadStatus::New->value, LeadStatus::Closed->value, LeadStatus::Completed->value,
            ]));

        return ApiResponse::ok($query->get()->map(fn (Lead $lead) => $this->serialize($lead)));
    }

    public function accept(Lead $lead, AcceptLeadAction $action): JsonResponse
    {
        /** @var User $manager */
        $manager = request()->user();
        $lead = $action->execute($manager, $lead);

        return ApiResponse::ok($this->serialize($lead->load(['user', 'manager', 'modelProfile.photos'])));
    }

    public function updateStatus(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', array_map(
                fn (LeadStatus $s) => $s->value,
                LeadStatus::managerSelectable(),
            ))],
        ]);

        $lead->update(['status' => $data['status']]);

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    /** @return array<string, mixed> */
    private function serialize(Lead $lead): array
    {
        $profile = $lead->modelProfile;
        $main = $profile
            ? ($profile->photos->firstWhere('is_main', true) ?? $profile->photos->first())
            : null;
        $client = $lead->user;

        return [
            'id' => $lead->id,
            'chat_id' => $lead->chat_id,
            'status' => $lead->status->value,
            'city' => $lead->city,
            'hair_type' => $lead->hair_type,
            'age_range' => $lead->age_range,
            'height_range' => $lead->height_range,
            'goal' => $lead->goal,
            'wishes' => $lead->wishes,
            'created_at' => $lead->created_at?->toIso8601String(),
            'manager_id' => $lead->manager_id,
            'identity_verified' => $lead->identity_verified_at !== null,
            'client' => $client ? [
                'name' => trim(($client->first_name ?? '').' '.($client->last_name ?? '')) ?: ($client->username ?? '—'),
                'username' => $client->username,
            ] : null,
            'model' => $profile ? [
                'display_name' => $profile->display_name,
                'display_name_en' => $profile->display_name_en,
                'photo' => $main?->getUrl(),
            ] : null,
        ];
    }
}
