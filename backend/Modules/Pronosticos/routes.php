<?php

use Illuminate\Support\Facades\Route;
use Modules\Pronosticos\ImportacionObservacionesController;
use Modules\Pronosticos\ObservacionController;
use Modules\Pronosticos\PronosticoController;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('observaciones')->group(function () {
        Route::get('/', [ObservacionController::class, 'index']);

        Route::middleware('can:observaciones.capturar')->post('/', [ObservacionController::class, 'store']);
        Route::middleware('can:observaciones.eliminar')->delete('/{observacion}', [ObservacionController::class, 'destroy']);
    });

    // Plantilla Excel (pre-llenada con lo que el producto ya tenga) e
    // importación masiva desde esa misma plantilla — mismo permiso que
    // capturar un solo mes, porque es exactamente eso, muchas veces.
    Route::middleware('can:observaciones.capturar')->prefix('productos/{producto}/observaciones')->group(function () {
        Route::get('/plantilla', [ImportacionObservacionesController::class, 'plantilla']);
        Route::post('/importar', [ImportacionObservacionesController::class, 'importar']);
    });

    // Calcular no modifica nada (no persiste un "escenario" todavía, eso es
    // RF-33) — por defecto lo tienen tanto administrador como gerente
    // (Modules\Auth\Permisos::DEFAULT_POR_ROL), pero ya queda como un
    // permiso real que el administrador puede quitarle a alguien puntual.
    Route::middleware('can:pronostico.calcular')->post('/pronosticos/calcular', [PronosticoController::class, 'calcular']);

    // Un solo viaje al servidor para el Dashboard: antes el frontend pedía
    // "el mejor método" producto por producto (5 cálculos por producto, cada
    // uno un POST aparte) — con esto el servidor hace las 5 cuentas en
    // memoria, sin ida y vuelta HTTP de por medio, y devuelve solo el ganador.
    Route::get('/pronosticos/resumen', [PronosticoController::class, 'resumen']);
});
