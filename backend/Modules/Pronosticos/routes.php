<?php

use Illuminate\Support\Facades\Route;
use Modules\Pronosticos\ObservacionController;
use Modules\Pronosticos\PronosticoController;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('observaciones')->group(function () {
        Route::get('/', [ObservacionController::class, 'index']);

        Route::middleware('admin')->group(function () {
            Route::post('/', [ObservacionController::class, 'store']);
            Route::delete('/{observacion}', [ObservacionController::class, 'destroy']);
        });
    });

    // Calcular no modifica nada (no persiste un "escenario" todavía, eso es
    // RF-33) — por eso sin middleware 'admin': el Gerente también puede.
    Route::post('/pronosticos/calcular', [PronosticoController::class, 'calcular']);
});
