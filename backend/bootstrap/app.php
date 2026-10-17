<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // routes/api.php agrupa automáticamente todo bajo el prefijo /api y
        // el middleware "api" — ahí es donde vive nuestro módulo Auth
        // (routes/api.php solo hace require de Modules/Auth/routes.php).
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Toda ruta /api/* debe responder SIEMPRE en JSON, incluso los
        // errores — un fetch() del navegador no siempre manda el header
        // Accept: application/json, y sin esto una petición no autenticada
        // devolvía la página HTML de bienvenida de Laravel en vez de un
        // 401 en JSON (rompía el contrato de la API).
        $exceptions->shouldRenderJsonWhen(function ($request, $throwable) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
