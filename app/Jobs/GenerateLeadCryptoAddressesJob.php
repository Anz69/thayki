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
use Illuminate\Support\Facades\Log;

class GenerateLeadCryptoAddressesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 1;

    public function __construct(public int $leadId, public int $messageId) {}

    public function handle(OxaPayService $oxa): void
    {
        $networks = (array) config('oxapay.networks', []);

        foreach ($networks as $network) {
            $row = LeadCryptoAddress::query()->firstOrCreate(
                ['lead_id' => $this->leadId, 'message_id' => $this->messageId, 'network' => $network],
                ['status' => LeadCryptoAddress::STATUS_PENDING],
            );

            if (in_array($row->status, [LeadCryptoAddress::STATUS_ACTIVE, LeadCryptoAddress::STATUS_PAID], true) && $row->address) {
                continue;
            }

            try {
                $orderId = 'lead'.$this->leadId.'-m'.$this->messageId.'-'.preg_replace('/[^A-Za-z0-9]/', '', $network);
                $res = $oxa->generateStaticAddress($network, $orderId, 'Lead #'.$this->leadId.' crypto payment');

                $row->update([
                    'address' => $res['address'],
                    'memo' => $res['memo'],
                    'track_id' => $res['track_id'],
                    'status' => $res['address'] !== '' ? LeadCryptoAddress::STATUS_ACTIVE : LeadCryptoAddress::STATUS_FAILED,
                ]);
            } catch (\Throwable $e) {
                Log::error('GenerateLeadCryptoAddressesJob: network failed', [
                    'lead_id' => $this->leadId,
                    'network' => $network,
                    'error' => $e->getMessage(),
                ]);
                $row->update(['status' => LeadCryptoAddress::STATUS_FAILED]);
            }
        }
    }
}
