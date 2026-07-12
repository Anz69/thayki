<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

class Locale
{
    public const SUPPORTED = ['ru', 'en', 'zh'];

    // Map any Telegram/BCP-47 language code (e.g. "en", "en-US", "zh-Hans", "ru") to
    // one of the app's supported locales. Unknown → Russian.
    public static function fromCode(?string $code): string
    {
        $c = strtolower(trim((string) $code));

        if (str_starts_with($c, 'zh')) {
            return 'zh';
        }
        if (str_starts_with($c, 'en')) {
            return 'en';
        }

        return 'ru';
    }

    public static function fromUser(?User $user): string
    {
        return self::fromCode($user?->language_code);
    }

    // Use an already-normalized locale if it's one we support, otherwise derive it from
    // a language code. Handy for a stored snapshot (e.g. lead.locale) with a live fallback.
    public static function normalize(?string $locale, ?string $fallbackCode = null): string
    {
        if (in_array($locale, self::SUPPORTED, true)) {
            return $locale;
        }

        return self::fromCode($fallbackCode);
    }
}
