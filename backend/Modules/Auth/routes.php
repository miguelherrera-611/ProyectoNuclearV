<?php

use Illuminate\Support\Facades\Route;
use Modules\Auth\AuthController;
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

// Administración de cuentas: solo el administrador ve y crea usuarios
// (RF-04 / RNF-11: la restricción vive acá, no solo en que el enlace esté
// oculto en el frontend).
Route::middleware(['auth:sanctum', 'admin'])->prefix('usuarios')->group(function () {
    Route::get('/', [UsuarioController::class, 'index']);
    Route::post('/', [UsuarioController::class, 'store']);
});
