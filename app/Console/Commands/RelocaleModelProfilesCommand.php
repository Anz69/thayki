<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ModelProfile;
use App\Support\RuTranslit;
use Illuminate\Console\Command;

class RelocaleModelProfilesCommand extends Command
{
    protected $signature = 'models:relocale {--force : Overwrite existing EN names}';

    protected $description = 'Fill display_name_en for model profiles via transliteration';

    public function handle(): int
    {
        $query = ModelProfile::query();
        if (! $this->option('force')) {
            $query->whereNull('display_name_en');
        }

        $n = 0;
        foreach ($query->get() as $profile) {
            $profile->display_name_en = RuTranslit::name((string) $profile->display_name);
            $profile->save();
            $this->line("  {$profile->display_name} → {$profile->display_name_en}");
            $n++;
        }

        $this->info("Updated {$n} profile(s).");

        return self::SUCCESS;
    }
}
