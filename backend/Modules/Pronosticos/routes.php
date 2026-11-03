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

    // Calcular un pronóstico no modifica nada (no guarda un "escenario"
    // todavía, eso es RF-33 y queda para después) — por eso no lleva el
    // middleware 'admin': el Gerente también puede correrlo y verlo.
    Route::post('/pronosticos/calcular', [PronosticoController::class, 'calcular']);
});
