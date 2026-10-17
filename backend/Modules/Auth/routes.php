<?php

use Illuminate\Support\Facades\Route;
use Modules\Auth\AuthController;

/*
|--------------------------------------------------------------------------
| Rutas del módulo Auth
|--------------------------------------------------------------------------
|
| Cada módulo es dueño de sus propias rutas (en vez de que todas vivan
| juntas en un único routes/api.php). routes/api.php del proyecto solo hace
| `require` de este archivo — así, cuando se agregue un segundo módulo, se
| suma una línea de require ahí, no lógica de rutas nueva.
|
| Las dos rutas públicas (login y verify-two-factor) llevan rate limiting
| nombrado (definido en AppServiceProvider) para frenar fuerza bruta.
| Las dos protegidas exigen un token de Sanctum válido.
|
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/verify-two-factor', [AuthController::class, 'verifyTwoFactor'])->middleware('throttle:two-factor');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});
