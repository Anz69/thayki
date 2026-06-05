<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Lightweight Russian → Latin transliteration for model display names.
 */
final class RuTranslit
{
    private const MAP = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
        'ф' => 'f', 'х' => 'kh', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'shch',
        'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
    ];

    public static function name(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return $value;
        }

        $out = '';
        $chars = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($chars as $ch) {
            $lower = mb_strtolower($ch, 'UTF-8');
            if (isset(self::MAP[$lower])) {
                $mapped = self::MAP[$lower];
                // Preserve capitalisation of the source letter.
                $out .= ($ch !== $lower && $mapped !== '') ? ucfirst($mapped) : $mapped;
            } else {
                $out .= $ch; // keep spaces / latin / punctuation as-is
            }
        }

        return ucfirst($out);
    }
}
