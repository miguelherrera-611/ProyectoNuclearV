<?php

use Illuminate\Support\Facades\Route;
use Modules\Auth\AuditoriaController;
use Modules\Auth\AuthController;
use Modules\Auth\PapeleraController;
use Modules\Auth\UsuarioController;

// Cada módulo es dueño de sus propias rutas; routes/api.php solo hace
// require de este archivo.
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/verify-two-factor', [AuthController::class, 'verifyTwoFactor'])->middleware('throttle:two-factor');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Administración de cuentas (RF-04 / RNF-11: la restricción vive acá, no
// solo en que el enlace esté oculto en el frontend). "usuarios.crear" cubre
// también editar — es la misma pantalla y el mismo riesgo (dar de alta y
// cambiar permisos son la misma acción administrativa).
Route::middleware('auth:sanctum')->prefix('usuarios')->group(function () {
    Route::middleware('can:usuarios.ver')->get('/', [UsuarioController::class, 'index']);
    Route::middleware('can:usuarios.ver')->get('/catalogo-permisos', [UsuarioController::class, 'catalogoPermisos']);
    Route::middleware('can:usuarios.crear')->post('/', [UsuarioController::class, 'store']);
    Route::middleware('can:usuarios.crear')->put('/{usuario}', [UsuarioController::class, 'update']);
    Route::middleware('can:usuarios.eliminar')->delete('/{usuario}', [UsuarioController::class, 'destroy']);
});

// Papelera: ve/restaura/purga lo eliminado de Productos, Observaciones y
// Usuarios desde una sola pantalla (ver Modules\Auth\PapeleraController).
Route::middleware('auth:sanctum')->prefix('papelera')->group(function () {
    Route::middleware('can:papelera.ver')->get('/', [PapeleraController::class, 'index']);
    Route::middleware('can:papelera.restaurar')->post('/{tipo}/{id}/restaurar', [PapeleraController::class, 'restaurar']);
    Route::middleware('can:papelera.eliminar_permanente')->delete('/{tipo}/{id}', [PapeleraController::class, 'eliminarPermanente']);
});

// Auditoría: historial de qué hizo cada quien (crear/editar/eliminar/
// restaurar) sobre Productos, Observaciones y Usuarios.
Route::middleware(['auth:sanctum', 'can:auditoria.ver'])->get('/auditoria', [AuditoriaController::class, 'index']);
