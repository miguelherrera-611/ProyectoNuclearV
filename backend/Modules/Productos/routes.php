<?php

use Illuminate\Support\Facades\Route;
use Modules\Productos\ProductoController;

Route::middleware('auth:sanctum')->prefix('productos')->group(function () {
    Route::get('/', [ProductoController::class, 'index']);

    // RF-04 / RNF-11: la restricción se aplica en el backend (permiso real
    // del usuario, Modules\Auth\Permisos), no solo ocultando el botón en el
    // frontend.
    Route::middleware('can:productos.crear')->post('/', [ProductoController::class, 'store']);
    Route::middleware('can:productos.editar')->put('/{producto}', [ProductoController::class, 'update']);
    Route::middleware('can:productos.eliminar')->delete('/{producto}', [ProductoController::class, 'destroy']);
});
