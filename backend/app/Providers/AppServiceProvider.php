<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Modules\Auth\Permisos;
use Modules\Auth\User;

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
        // Clave email+IP (no solo IP, como el throttle genérico de
        // Laravel): un atacante con varias IPs no puede seguir probando
        // contraseñas contra una misma cuenta.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->input('email').'|'.$request->ip());
        });

        // Mismo criterio, pero con challenge_token en vez de email — esta
        // request no manda el correo.
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->input('challenge_token').'|'.$request->ip());
        });

        // Para /perfil/cambiar-correo/*: ya hay sesión (auth:sanctum), así
        // que se clava por usuario en vez de por email/challenge_token.
        RateLimiter::for('perfil', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
        });

        // Un Gate por cada clave del catálogo (Modules\Auth\Permisos), para
        // poder proteger una ruta con ->middleware('can:productos.crear')
        // en vez del antiguo middleware 'admin' fijo — la autorización real
        // queda en lo que tenga guardado CADA usuario, no en su rol.
        foreach (array_keys(Permisos::TODAS) as $clave) {
            Gate::define($clave, fn (User $user) => $user->tienePermiso($clave));
        }
    }
}
