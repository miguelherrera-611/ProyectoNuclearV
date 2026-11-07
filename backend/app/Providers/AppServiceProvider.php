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
    }
}
