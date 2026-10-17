<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate limiting para el login: 5 intentos por minuto.
        //
        // Ojo con la clave usada (`by`): si se limitara SOLO por IP (como
        // hace el `throttle:5,1` genérico de Laravel), un atacante con
        // varias IPs podría seguir probando contraseñas contra UNA misma
        // cuenta sin que nada lo frene. Al combinar email+IP, cada cuenta
        // también queda protegida individualmente, sin importar desde
        // cuántas direcciones distintas se la ataque a la vez.
        //
        // (No es una solución completa contra un ataque MUY distribuido
        // con miles de IPs diferentes — eso ya es un problema de otro nivel
        // que normalmente se resuelve en el servidor/proxy, no en la app.
        // Pero cubre el caso común de fuerza bruta.)
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->input('email').'|'.$request->ip());
        });

        // Mismo criterio para el paso 2 (verificar el código 2FA), pero acá
        // la clave natural es el challenge_token en vez del email, porque
        // esa request no manda el correo.
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->input('challenge_token').'|'.$request->ip());
        });
    }
}
