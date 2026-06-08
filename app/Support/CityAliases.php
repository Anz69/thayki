<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Bilingual (RU/EN) aliases for popular cities so search matches a lead's city
 * regardless of which language/spelling it was saved in ("Moscow" vs "Москва").
 *
 * Matching is fuzzy-substring in both directions, so partial input works too
 * ("моск" → Москва/Moscow, "spb" → Санкт-Петербург/Питер/SPb).
 */
final class CityAliases
{
    /** @var array<int, array<int, string>> Each group lists equivalent names. */
    private const GROUPS = [
        ['москва', 'moscow', 'мск', 'msk'],
        ['санкт-петербург', 'saint petersburg', 'st petersburg', 'st. petersburg', 'петербург', 'питер', 'спб', 'пбург', 'spb', 'sankt-peterburg', 'piter'],
        ['сочи', 'sochi'],
        ['казань', 'kazan'],
        ['екатеринбург', 'yekaterinburg', 'ekaterinburg', 'екб', 'ekb'],
        ['новосибирск', 'novosibirsk', 'нск'],
        ['нижний новгород', 'nizhny novgorod', 'nizhniy novgorod'],
        ['краснодар', 'krasnodar'],
        ['ростов-на-дону', 'ростов', 'rostov', 'rostov-on-don'],
        ['омск', 'omsk'],
        ['самара', 'samara'],
        ['уфа', 'ufa'],
        ['челябинск', 'chelyabinsk'],
        ['пермь', 'perm'],
        ['воронеж', 'voronezh'],
        ['волгоград', 'volgograd'],
        ['красноярск', 'krasnoyarsk'],
        ['владивосток', 'vladivostok', 'vlad'],
        ['калининград', 'kaliningrad'],
        ['тюмень', 'tyumen'],
        ['дубай', 'dubai', 'дубаи'],
        ['абу-даби', 'abu dhabi', 'абу даби'],
        ['пхукет', 'phuket'],
        ['бангкок', 'bangkok'],
        ['паттайя', 'pattaya', 'паттая'],
        ['тбилиси', 'tbilisi'],
        ['батуми', 'batumi'],
        ['ереван', 'yerevan', 'erevan'],
        ['минск', 'minsk'],
        ['алматы', 'almaty', 'алма-ата', 'alma-ata'],
        ['астана', 'astana', 'нур-султан', 'nur-sultan'],
        ['баку', 'baku'],
        ['ташкент', 'tashkent'],
        ['стамбул', 'istanbul', 'стамбул'],
        ['анталья', 'antalya', 'анталия'],
        ['париж', 'paris'],
        ['лондон', 'london'],
        ['нью-йорк', 'new york', 'newyork', 'нью йорк', 'ny'],
        ['милан', 'milan', 'milano'],
        ['рим', 'rome', 'roma'],
        ['барселона', 'barcelona'],
        ['мадрид', 'madrid'],
    ];

    /**
     * Expand a search term into all equivalent city spellings (the original
     * term always included). Returns just `[term]` when no city group matches.
     *
     * @return array<int, string>
     */
    public static function expand(string $term): array
    {
        $needle = mb_strtolower(trim($term));
        if ($needle === '') {
            return [];
        }
        // Too short to disambiguate — don't expand (avoids matching everything).
        if (mb_strlen($needle) < 2) {
            return [$term];
        }

        $out = [$term];
        foreach (self::GROUPS as $group) {
            foreach ($group as $name) {
                // When either side is a short token/abbreviation (msk, spb, ny,
                // екб…) require an exact match, otherwise it false-matches via
                // substring ("omsk" ⊃ "msk", "nizhny" ⊃ "ny").
                $shortest = min(mb_strlen($name), mb_strlen($needle));
                $match = $shortest <= 3
                    ? $needle === $name
                    : (str_contains($name, $needle) || str_contains($needle, $name));
                if ($match) {
                    foreach ($group as $alias) {
                        $out[] = $alias;
                    }
                    break;
                }
            }
        }

        return array_values(array_unique($out));
    }
}
