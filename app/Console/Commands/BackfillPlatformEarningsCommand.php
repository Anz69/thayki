<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\WalletTransactionType;
use App\Models\Payment;
use App\Models\PlatformEarning;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;

/**
 * Backfill platform_earnings rows for previously-confirmed payments.
 *
 * Reads each CreditPayment wallet transaction (which already carries the
 * commission rate and gross amount in `meta`) and creates a PlatformEarning
 * record if none exists. The unique constraint on payment_id makes the
 * command idempotent — repeated runs do nothing.
 */
class BackfillPlatformEarningsCommand extends Command
{
    protected $signature = 'platform:backfill-earnings
        {--dry-run : Show what would be inserted without writing}';

    protected $description = 'Reconstruct platform_earnings ledger from existing wallet transactions';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $created = 0;
        $skipped = 0;
        $missing = 0;

        $query = WalletTransaction::query()
            ->where('type', WalletTransactionType::CreditPayment)
            ->where('reference_type', Payment::class)
            ->whereNotNull('reference_id')
            ->orderBy('id');

        $total = (clone $query)->count();
        $this->info("Scanning {$total} credit transactions...");

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $query->chunkById(500, function ($txs) use (&$created, &$skipped, &$missing, $dryRun, $bar): void {
            foreach ($txs as $tx) {
                $bar->advance();

                $payment = Payment::query()->find($tx->reference_id);
                if ($payment === null) {
                    $missing++;
                    continue;
                }

                if (PlatformEarning::query()->where('payment_id', $payment->id)->exists()) {
                    $skipped++;
                    continue;
                }

                $meta = $tx->meta ?? [];
                $rate = (float) ($meta['commission'] ?? 0.0);
                $gross = (int) ($meta['gross_minor'] ?? ($payment->amount_minor + abs((int) $tx->amount_minor)));
                $net = (int) $tx->amount_minor;
                // Prefer explicit value from meta; otherwise derive from gross - net.
                $commissionMinor = (int) ($meta['commission_minor'] ?? ($gross - $net));
                $confirmedAt = $payment->confirmed_at ?? $tx->created_at;

                if ($dryRun) {
                    $created++;
                    continue;
                }

                PlatformEarning::query()->create([
                    'payment_id' => $payment->id,
                    'meeting_id' => $payment->meeting_id,
                    'model_profile_id' => optional($payment->meeting)->model_profile_id,
                    'gross_minor' => $gross,
                    'commission_rate' => $rate,
                    'commission_minor' => $commissionMinor,
                    'net_minor' => $net,
                    'source' => $meta['source'] ?? PlatformEarning::SOURCE_DEFAULT,
                    'confirmed_at' => $confirmedAt,
                ]);

                $created++;
            }
        });

        $bar->finish();
        $this->newLine(2);

        $verb = $dryRun ? 'Would create' : 'Created';
        $this->info("{$verb}: {$created}");
        $this->info("Skipped (already present): {$skipped}");
        if ($missing > 0) {
            $this->warn("Orphan transactions (payment missing): {$missing}");
        }

        return self::SUCCESS;
    }
}
