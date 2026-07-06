<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonInterface;

class DisplayTimezone
{
    // The viewer's IANA timezone, taken from the plaintext `tz` cookie set by the
    // admin panel's browser script. Falls back to the app timezone (UTC).
    public static function get(): string
    {
        $tz = $_COOKIE['tz'] ?? null;

        return (is_string($tz) && in_array($tz, timezone_identifiers_list(), true))
            ? $tz
            : (string) config('app.timezone');
    }

    // Format a stored (UTC) datetime in the viewer's timezone. Null-safe.
    public static function format(?CarbonInterface $dt, string $format = 'd.m.Y H:i', string $fallback = '—'): string
    {
        if ($dt === null) {
            return $fallback;
        }

        return $dt->copy()->setTimezone(self::get())->format($format);
    }
}
