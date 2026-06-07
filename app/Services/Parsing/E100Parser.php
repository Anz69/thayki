<?php

declare(strict_types=1);

namespace App\Services\Parsing;

use App\Exceptions\DomainException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Parses a model page from e100.club (server-rendered HTML) into our internal
 * draft format, downloading the photos into local storage so the resulting
 * card is self-contained.
 *
 * Example page: https://e100.club/?p=62_5851f3f77325a11ba66023b845000585350
 * The page exposes params inside `<div class="col-md-12">Label: <strong>v</strong></div>`
 * and media via `img.php?p={token}&i={n}` (photos) / `&v={n}` (videos).
 */
class E100Parser
{
    private const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

    private const HOST = 'e100.club';

    private const MAX_PHOTOS = 25;

    private const MAX_VIDEOS = 6;

    /** Cyrillic label (lowercased, no unit suffix) → internal field. */
    private const MAP = [
        'возраст' => 'age',
        'рост' => 'height_cm',
        'вес' => 'weight_kg',
        'грудь' => 'bust_cm',
        'талия' => 'waist_cm',
        'бедра' => 'hips_cm',
        'бюст' => 'breast_size',
        'цвет волос' => 'hair',
        'цвет глаз' => 'eyes',
    ];

    /**
     * @return array<string, mixed>
     */
    public function parse(string $url): array
    {
        // Downloading many remote files can exceed PHP-FPM's default 30s cap.
        @set_time_limit(180);

        $token = $this->extractToken($url);
        if ($token === null) {
            throw DomainException::invalid('BAD_URL', 'Ссылка не похожа на страницу модели e100.club.');
        }

        $page = 'https://'.self::HOST.'/?p='.$token;

        try {
            $res = Http::withHeaders([
                'User-Agent' => self::UA,
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'ru-RU,ru;q=0.9,en;q=0.8',
                'Referer' => 'https://'.self::HOST.'/',
            ])
                ->withOptions(['allow_redirects' => true, 'verify' => false])
                ->retry(2, 800, throw: false)
                ->timeout(25)
                ->get($page);
        } catch (\Throwable $e) {
            throw DomainException::invalid('FETCH_FAILED', 'Не удалось загрузить страницу модели: '.$e->getMessage());
        }

        if (! $res->successful()) {
            throw DomainException::invalid('FETCH_FAILED', 'Страница недоступна (HTTP '.$res->status().').');
        }

        $html = $res->body();

        $name = $this->matchTitle($html);
        $params = $this->matchParams($html);
        $photoIndexes = $this->matchMediaIndexes($html, 'i');
        $videoIndexes = $this->matchMediaIndexes($html, 'v');

        // Download all media concurrently (in small batches) so a model with
        // 15+ photos and videos doesn't take ~90s sequentially.
        $draft = Str::random(24);

        // One combined concurrent pass for photos + videos + posters (fewer
        // sequential rounds → faster overall).
        $jobs = [];
        $photoSrcs = [];
        foreach (array_slice($photoIndexes, 0, self::MAX_PHOTOS) as $i) {
            $src = 'https://'.self::HOST.'/img.php?p='.$token.'&i='.$i;
            $jobs[$src] = "parsed-models/{$draft}/p{$i}.jpg";
            $photoSrcs[] = $src;
        }
        $videoMeta = [];
        foreach (array_slice($videoIndexes, 0, self::MAX_VIDEOS) as $v) {
            $vsrc = 'https://'.self::HOST.'/img.php?p='.$token.'&v='.$v;
            $psrc = 'https://'.self::HOST.'/img.php?p='.$token.'&preview=1&v='.$v;
            $jobs[$vsrc] = "parsed-models/{$draft}/v{$v}.mp4";
            $jobs[$psrc] = "parsed-models/{$draft}/v{$v}.jpg";
            $videoMeta[] = ['v' => $vsrc, 'p' => $psrc];
        }

        $r = $this->downloadBatch($jobs);

        $photos = array_values(array_filter(array_map(fn ($s) => $r[$s] ?? null, $photoSrcs)));
        $videos = [];
        foreach ($videoMeta as $m) {
            if (($r[$m['v']] ?? null) === null) {
                continue;
            }
            $videos[] = ['url' => $r[$m['v']], 'poster' => $r[$m['p']] ?? null];
        }

        return array_merge([
            'source' => 'e100',
            'source_token' => $token,
            'draft' => $draft,
            'display_name' => $name,
            'display_name_en' => null,
            'description' => null,
            'photos' => $photos,
            'videos' => $videos,
        ], $params);
    }

    private function extractToken(string $url): ?string
    {
        $parts = parse_url(trim($url));
        if (($parts['host'] ?? null) !== null && ! str_contains((string) $parts['host'], self::HOST)) {
            return null;
        }
        parse_str($parts['query'] ?? '', $q);
        $p = $q['p'] ?? null;

        return (is_string($p) && preg_match('/^[A-Za-z0-9_]+$/', $p)) ? $p : null;
    }

    private function matchTitle(string $html): ?string
    {
        if (preg_match('/<h2>\s*(.*?)\s*<\/h2>/su', $html, $m)) {
            return trim(html_entity_decode($m[1]));
        }
        if (preg_match('/<title>\s*(.*?)\s*<\/title>/su', $html, $m)) {
            return trim(html_entity_decode($m[1]));
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function matchParams(string $html): array
    {
        $out = [];
        if (preg_match_all('/<div class="col-md-12">\s*([^:<]+):\s*<strong>\s*([^<]*?)\s*<\/strong>/su', $html, $rows, PREG_SET_ORDER)) {
            foreach ($rows as $row) {
                $label = mb_strtolower(trim(html_entity_decode($row[1])));
                $label = trim(preg_replace('/[,\s]*(см|кг)\s*$/u', '', $label));
                $value = trim(html_entity_decode($row[2]));
                if ($value === '' || ! isset(self::MAP[$label])) {
                    continue;
                }
                $field = self::MAP[$label];
                $out[$field] = in_array($field, ['age', 'height_cm', 'weight_kg', 'bust_cm', 'waist_cm', 'hips_cm'], true)
                    ? (int) preg_replace('/\D/', '', $value)
                    : $value;
            }
        }

        return $out;
    }

    /**
     * Collect distinct media indexes for `img.php?...&{key}={n}` (full-size only,
     * skipping the `preview=1` thumbnails).
     *
     * @return list<int>
     */
    private function matchMediaIndexes(string $html, string $key): array
    {
        $found = [];
        if (preg_match_all('/img\.php\?[^"\']*?(?<!preview=1)&'.$key.'=(\d+)/u', $html, $m)) {
            foreach ($m[1] as $n) {
                $found[(int) $n] = true;
            }
        }
        $keys = array_keys($found);
        sort($keys);

        return $keys;
    }

    /**
     * Download many remote files concurrently (batched, to avoid being rate
     * limited). Returns a map of source URL → stored public URL (null on fail).
     *
     * @param  array<string, string>  $jobs  source URL => destination path
     * @return array<string, string|null>
     */
    private function downloadBatch(array $jobs): array
    {
        $out = [];
        foreach (array_chunk($jobs, 12, true) as $chunk) {
            $srcs = array_keys($chunk);

            try {
                $responses = Http::pool(fn (Pool $pool) => array_map(
                    fn (string $src) => $pool->as($src)
                        ->withHeaders(['User-Agent' => self::UA, 'Referer' => 'https://'.self::HOST.'/'])
                        ->withOptions(['verify' => false])
                        ->timeout(25)
                        ->get($src),
                    $srcs,
                ));
            } catch (\Throwable) {
                $responses = [];
            }

            foreach ($chunk as $src => $path) {
                $res = $responses[$src] ?? null;
                try {
                    if ($res instanceof Response && $res->successful() && $res->body() !== '') {
                        Storage::disk('public')->put($path, $res->body());
                        $out[$src] = Storage::disk('public')->url($path);
                    } else {
                        $out[$src] = null;
                    }
                } catch (\Throwable) {
                    $out[$src] = null;
                }
            }
        }

        return $out;
    }
}
