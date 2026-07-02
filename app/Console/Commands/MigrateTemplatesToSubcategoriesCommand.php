<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\MessageTemplate;
use App\Models\TemplateCategory;
use App\Models\TemplateSubcategory;
use Illuminate\Console\Command;

class MigrateTemplatesToSubcategoriesCommand extends Command
{
    protected $signature = 'templates:migrate-subcategories {--name=Общее : Название дефолтной подкатегории}';

    protected $description = 'Перенести шаблоны без подкатегории в дефолтную подкатегорию внутри их категории';

    public function handle(): int
    {
        $defaultName = (string) $this->option('name');
        $movedTotal = 0;
        $subsCreated = 0;

        $categoryIds = MessageTemplate::query()
            ->whereNull('subcategory_id')
            ->whereNotNull('category_id')
            ->distinct()
            ->pluck('category_id');

        if ($categoryIds->isEmpty()) {
            $this->info('Нет шаблонов без подкатегории — переносить нечего.');

            return self::SUCCESS;
        }

        foreach ($categoryIds as $categoryId) {
            $category = TemplateCategory::query()->find($categoryId);
            if ($category === null) {
                continue;
            }

            $subcategory = TemplateSubcategory::query()
                ->where('category_id', $category->id)
                ->where('name', $defaultName)
                ->first();

            if ($subcategory === null) {
                $subcategory = TemplateSubcategory::query()->create([
                    'category_id' => $category->id,
                    'name' => $defaultName,
                    'position' => 0,
                ]);
                $subsCreated++;
            }

            $moved = MessageTemplate::query()
                ->where('category_id', $category->id)
                ->whereNull('subcategory_id')
                ->update(['subcategory_id' => $subcategory->id]);

            $movedTotal += $moved;
            $this->line("Категория «{$category->name}»: перенесено {$moved} шаблон(ов) в «{$defaultName}».");
        }

        $this->info("Готово. Создано подкатегорий: {$subsCreated}, перенесено шаблонов: {$movedTotal}.");

        return self::SUCCESS;
    }
}
