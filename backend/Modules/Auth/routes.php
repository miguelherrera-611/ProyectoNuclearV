<?php

use Illuminate\Support\Facades\Route;
use Modules\Auth\AuthController;

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
