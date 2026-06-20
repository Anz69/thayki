<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupExpiredModelCardsCommand extends Command
{
    protected $signature = 'model-cards:cleanup {--ttl=24 : Hours a sent profile stays viewable} {--dry : Only report, do not delete}';

    protected $description = 'Delete downloaded media of model_card messages older than the TTL and mark them expired';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $ttl = max(1, (int) $this->option('ttl'));
        $cutoff = now()->subHours($ttl);

        $deletedFiles = 0;
        $cards = 0;

        Message::query()
            ->where('type', 'model_card')
            ->where('created_at', '<', $cutoff)
            ->whereNull('payload->expired')
            ->chunkById(100, function ($messages) use (&$deletedFiles, &$cards, $dry) {
                foreach ($messages as $message) {
                    $payload = $message->payload ?? [];
                    $deletedFiles += $this->purgeMedia($payload['models'] ?? [], $dry);
                    $cards++;
                    if (! $dry) {
                        // Keep the card as an expired tombstone; drop the heavy media payload.
                        $message->update(['payload' => ['expired' => true]]);
                    }
                }
            });

        $this->info(($dry ? '[dry] ' : '')."Expired {$cards} model card(s), removed {$deletedFiles} media file(s).");

        return self::SUCCESS;
    }

    /**
     * @param  array<int, array<string, mixed>>  $models
     */
    private function purgeMedia(array $models, bool $dry): int
    {
        $removed = 0;
        foreach ($models as $model) {
            foreach (($model['photos'] ?? []) as $photo) {
                $removed += $this->deleteLocal(is_string($photo) ? $photo : null, $dry);
            }
            foreach (($model['videos'] ?? []) as $video) {
                $removed += $this->deleteLocal($video['url'] ?? null, $dry);
                $removed += $this->deleteLocal($video['poster'] ?? null, $dry);
            }
        }

        return $removed;
    }

    private function deleteLocal(?string $url, bool $dry): int
    {
        if (! is_string($url) || $url === '') {
            return 0;
        }

        // Only touch files we host ourselves (public disk → /storage/...); skip external URLs.
        $marker = '/storage/';
        $pos = strpos($url, $marker);
        if ($pos === false) {
            return 0;
        }

        $path = ltrim(substr($url, $pos + strlen($marker)), '/');
        if ($path === '') {
            return 0;
        }

        if ($dry) {
            $this->line('[dry] delete '.$path);

            return Storage::disk('public')->exists($path) ? 1 : 0;
        }

        try {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);

                return 1;
            }
        } catch (\Throwable) {
        }

        return 0;
    }
}
