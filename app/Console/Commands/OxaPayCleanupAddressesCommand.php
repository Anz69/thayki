<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\LeadCryptoAddress;
use App\Services\Payments\OxaPayService;
use Illuminate\Console\Command;

class OxaPayCleanupAddressesCommand extends Command
{
    protected $signature = 'oxapay:cleanup-addresses {--dry : Only report, do not revoke}';

    protected $description = 'Revoke leftover OxaPay static addresses (closed leads + orphans not tied to an open lead)';

    private const CLOSED_STATUSES = ['completed', 'closed'];

    public function handle(OxaPayService $oxa): int
    {
        $dry = (bool) $this->option('dry');
        $revoked = 0;

        $localRows = LeadCryptoAddress::query()
            ->where('status', LeadCryptoAddress::STATUS_ACTIVE)
            ->whereNotNull('address')
            ->whereHas('lead', fn ($q) => $q->whereIn('status', self::CLOSED_STATUSES))
            ->get();

        foreach ($localRows as $row) {
            $this->line(($dry ? '[dry] ' : '').'revoke (closed lead) '.$row->address);
            if (! $dry && $oxa->revokeStaticAddress((string) $row->address)) {
                $row->update(['status' => LeadCryptoAddress::STATUS_REVOKED]);
                $revoked++;
            }
        }

        $page = 1;
        $last = 1;
        do {
            $data = $oxa->listStaticAddresses($page, 200);
            foreach (($data['list'] ?? []) as $item) {
                $addr = (string) ($item['address'] ?? '');
                if ($addr === '') {
                    continue;
                }

                $row = LeadCryptoAddress::query()->where('address', $addr)->first();

                $shouldRevoke = false;
                if ($row === null) {
                    $shouldRevoke = true;
                } elseif ($row->status !== LeadCryptoAddress::STATUS_PAID && $row->status !== LeadCryptoAddress::STATUS_REVOKED) {
                    $leadStatus = $row->lead?->status?->value ?? (string) $row->lead?->status;
                    if ($row->lead === null || in_array($leadStatus, self::CLOSED_STATUSES, true)) {
                        $shouldRevoke = true;
                    }
                }

                if ($shouldRevoke) {
                    $this->line(($dry ? '[dry] ' : '').'revoke (oxapay '.($row ? 'closed/orphan-row' : 'orphan').') '.$addr);
                    if (! $dry && $oxa->revokeStaticAddress($addr)) {
                        $row?->update(['status' => LeadCryptoAddress::STATUS_REVOKED]);
                        $revoked++;
                    }
                }
            }
            $last = (int) ($data['meta']['last_page'] ?? 1);
            $page++;
        } while ($page <= $last);

        $this->info(($dry ? 'Would revoke' : 'Revoked').': '.($dry ? ($localRows->count()) : $revoked).' (run without --dry to apply)');

        return self::SUCCESS;
    }
}
