<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Necesita un cron real en el servidor que corra "php artisan schedule:run"
// cada minuto (Laravel decide solo cuándo le toca a cada tarea) — ver
// DEPLOY.md para la línea exacta de hPanel.
Schedule::command('papelera:purgar')->daily();
