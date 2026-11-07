<?php

use Illuminate\Support\Facades\Route;

// Sin página de login "web" (todo pasa por la API/React) — esta ruta solo
// existe para que la redirección interna de Laravel a route('login') tenga
// algo a qué apuntar. Un cliente con Accept: application/json nunca llega acá.
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Catch-all del SPA: cualquier ruta que no empiece con "api/" devuelve el
// index.html ya construido de React, para que el mismo dominio sirva
// frontend y backend sin CORS. Debe ser la ÚLTIMA ruta web.
Route::get('/{any?}', function () {
    $index = public_path('app/index.html');

    abort_unless(file_exists($index), 404, 'Frontend no construido todavía (falta "npm run build" en frontend/).');

    return response()->file($index);
})->where('any', '^(?!api).*$');
