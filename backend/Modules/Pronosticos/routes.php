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

    // Un solo viaje al servidor para el Dashboard: antes el frontend pedía
    // "el mejor método" producto por producto (5 cálculos por producto, cada
    // uno un POST aparte) — con esto el servidor hace las 5 cuentas en
    // memoria, sin ida y vuelta HTTP de por medio, y devuelve solo el ganador.
    Route::get('/pronosticos/resumen', [PronosticoController::class, 'resumen']);
});
