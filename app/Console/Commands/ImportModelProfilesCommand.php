<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ModelPhoto;
use App\Models\ModelProfile;
use App\Support\RuTranslit;
use Illuminate\Console\Command;
use Illuminate\Http\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Bulk-imports static prototype model profiles from a folder.
 *
 * Folder layout: one subdirectory per model, each containing:
 *   info.txt   — "Ключ: значение" lines (Имя, Рост, Грудь, Талия, Бёдра, Глаза, Размер груди, Возраст)
 *   photos/    — NNN.jpeg images
 *
 * Usage: php artisan models:import "/path/to/mds" [--fresh]
 */
class ImportModelProfilesCommand extends Command
{
    protected $signature = 'models:import {path : Folder containing model subdirectories} {--fresh : Delete all existing prototype profiles (user_id IS NULL) first}';

    protected $description = 'Import static prototype model profiles (info.txt + photos) from a folder';

    /** info.txt key (lowercased, ё→е) → handler */
    private const KEYS = [
        'имя' => 'display_name',
        'рост' => 'height_cm',
        'грудь' => 'bust_cm',
        'талия' => 'waist_cm',
        'бедра' => 'hips_cm',
        'глаза' => 'eyes',
        'размер груди' => 'breast_size',
        'возраст' => 'age',
    ];

    private const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'webp'];

    public function handle(): int
    {
        $root = rtrim((string) $this->argument('path'), '/');
        if (! is_dir($root)) {
            $this->error("Folder not found: {$root}");

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            $deleted = ModelProfile::query()->whereNull('user_id')->get();
            foreach ($deleted as $p) {
                Storage::disk('public')->deleteDirectory("model-photos/{$p->id}");
                $p->delete();
            }
            $this->warn("Removed {$deleted->count()} existing prototype profile(s).");
        }

        $dirs = array_filter(glob($root.'/*', GLOB_ONLYDIR) ?: [], 'is_dir');
        sort($dirs, SORT_NATURAL | SORT_FLAG_CASE);

        $created = 0;
        $skipped = 0;
        $photosTotal = 0;

        foreach ($dirs as $dir) {
            $infoPath = $dir.'/info.txt';
            if (! is_file($infoPath)) {
                $this->line('  · skip (no info.txt): '.basename($dir));

                continue;
            }

            $data = $this->parseInfo((string) file_get_contents($infoPath));
            $name = $data['display_name'] ?? basename($dir);

            if (! $this->option('fresh') && ModelProfile::query()->where('display_name', $name)->exists()) {
                $this->line("  · skip (exists): {$name}");
                $skipped++;

                continue;
            }

            $photos = $this->collectPhotos($dir.'/photos');

            $count = DB::transaction(function () use ($data, $name, $photos): int {
                /** @var ModelProfile $profile */
                $profile = ModelProfile::query()->create([
                    'user_id' => null,
                    'display_name' => $name,
                    'display_name_en' => RuTranslit::name($name),
                    'age' => (int) ($data['age'] ?? 0),
                    'height_cm' => (int) ($data['height_cm'] ?? 0),
                    'bust_cm' => isset($data['bust_cm']) ? (int) $data['bust_cm'] : null,
                    'waist_cm' => isset($data['waist_cm']) ? (int) $data['waist_cm'] : null,
                    'hips_cm' => isset($data['hips_cm']) ? (int) $data['hips_cm'] : null,
                    'eyes' => $data['eyes'] ?? null,
                    'breast_size' => $data['breast_size'] ?? null,
                    'weight_kg' => null,
                    'bust_size' => null,
                    'butt_size' => null,
                    'hourly_rate_thb' => 0,
                    'schedule' => 'any',
                    'is_published' => true,
                    'is_verified' => true,
                    'published_at' => now(),
                ]);

                foreach ($photos as $i => $absPath) {
                    $ext = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
                    $stored = Storage::disk('public')->putFileAs(
                        "model-photos/{$profile->id}",
                        new File($absPath),
                        ($i + 1).'.'.$ext,
                    );

                    ModelPhoto::query()->create([
                        'model_profile_id' => $profile->id,
                        'disk' => 'public',
                        'path' => $stored,
                        'position' => $i,
                        'is_main' => $i === 0,
                    ]);
                }

                return count($photos);
            });

            $created++;
            $photosTotal += $count;
            $this->info("  ✓ {$name} — {$count} photo(s)");
        }

        $this->newLine();
        $this->info("Done. Created: {$created}, skipped: {$skipped}, photos: {$photosTotal}.");

        return self::SUCCESS;
    }

    /**
     * Parse "Ключ: значение" lines into a normalized field map.
     *
     * @return array<string, string>
     */
    private function parseInfo(string $raw): array
    {
        $out = [];
        foreach (preg_split('/\r\n|\r|\n/', $raw) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || ! str_contains($line, ':')) {
                continue;
            }
            [$key, $value] = explode(':', $line, 2);
            $key = str_replace('ё', 'е', mb_strtolower(trim($key)));
            $value = trim($value);
            if ($value === '' || ! isset(self::KEYS[$key])) {
                continue;
            }
            $out[self::KEYS[$key]] = $value;
        }

        return $out;
    }

    /**
     * @return list<string> Absolute photo paths, natural-sorted.
     */
    private function collectPhotos(string $photosDir): array
    {
        if (! is_dir($photosDir)) {
            return [];
        }

        $files = [];
        foreach (glob($photosDir.'/*') ?: [] as $f) {
            if (is_file($f) && in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), self::PHOTO_EXT, true)) {
                $files[] = $f;
            }
        }
        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        return $files;
    }
}
