<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\LeadCryptoAddress;
use App\Services\Payments\OxaPayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RevokeLeadCryptoAddressesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 1;

    public function __construct(public int $leadId, public ?int $exceptAddressId = null) {}

    public function handle(OxaPayService $oxa): void
    {
        $rows = LeadCryptoAddress::query()
            ->where('lead_id', $this->leadId)
            ->where('status', LeadCryptoAddress::STATUS_ACTIVE)
            ->whereNotNull('address')
            ->when($this->exceptAddressId !== null, fn ($q) => $q->where('id', '!=', $this->exceptAddressId))
            ->get();

        foreach ($rows as $row) {
            $ok = $oxa->revokeStaticAddress((string) $row->address);
            if ($ok) {
                $row->update(['status' => LeadCryptoAddress::STATUS_REVOKED]);
            }
        }
    }
}
