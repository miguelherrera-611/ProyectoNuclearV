<?php

use Illuminate\Support\Facades\Route;

// Este proyecto no tiene una página de login "web" (todo el login real
// pasa por la API, consumida desde React) — esta ruta existe solo para que
// la lógica interna de Laravel de "si no estás autenticado, redirige a
// route('login')" tenga algo a qué apuntar, en vez de romper con un error
// de "ruta no encontrada". Un cliente que manda Accept: application/json
// (como nuestro frontend) nunca llega siquiera a pasar por acá.
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Catch-all del SPA: cualquier ruta que no empiece con "api/" devuelve el
// index.html ya construido de React (public/app/index.html), para que el
// mismo dominio de Hostinger sirva frontend y backend sin CORS. Los
// archivos reales bajo public/app/assets/... los sirve Apache/LiteSpeed
// directo (son archivos de verdad en disco, el .htaccess de Laravel los
// deja pasar sin tocar index.php) — esta ruta solo entra en juego para la
// URL "bonita" en sí (/, o cualquier otra que el SPA llegue a usar).
//
// En desarrollo local (npm run dev de frontend/) esta ruta no se usa: ahí
// se entra directo por http://localhost:5173, no por Laravel.
//
// IMPORTANTE: debe ser la ÚLTIMA ruta web — cualquier ruta nueva que se
// agregue después de esta nunca se alcanzaría.
Route::get('/{any?}', function () {
    $index = public_path('app/index.html');

    abort_unless(file_exists($index), 404, 'Frontend no construido todavía (falta "npm run build" en frontend/).');

    return response()->file($index);
})->where('any', '^(?!api).*$');
