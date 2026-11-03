<?php

use Illuminate\Support\Facades\Route;
use Modules\Productos\ProductoController;

Route::middleware('auth:sanctum')->prefix('productos')->group(function () {
    Route::get('/', [ProductoController::class, 'index']);

    // Crear/editar/dar de baja son acciones que modifican datos — solo
    // administrador (RF-04 / RNF-11: la restricción se aplica acá, en el
    // backend, no solo ocultando el botón en el frontend).
    Route::middleware('admin')->group(function () {
        Route::post('/', [ProductoController::class, 'store']);
        Route::put('/{producto}', [ProductoController::class, 'update']);
        Route::delete('/{producto}', [ProductoController::class, 'destroy']);
    });
});
