<?php

namespace Modules\Auth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Envoltorio (wrapper) chiquito sobre la API de Brevo para mandar el correo
 * con el código de 2FA.
 *
 * Esta clase vive dentro del módulo Auth (no en una capa "Services/"
 * compartida entre módulos) porque es una decisión propia de ESTE módulo:
 * aislar la dependencia externa (Brevo) en un solo lugar, para que si el
 * día de mañana se cambia de proveedor de correo, solo se toca este archivo.
 */
class BrevoMailer
{
    /**
     * Manda el código de 2FA por correo usando la API REST de Brevo
     * (https://api.brevo.com/v3/smtp/email).
     *
     * Devuelve true/false en vez de lanzar una excepción: si Brevo falla
     * (ej. porque todavía no hay API key configurada), el login no debe
     * romperse — el controlador decide qué hacer con el resultado (hoy:
     * seguir igual, y en entorno local mostrar el código en pantalla).
     */
    public function sendTwoFactorCode(User $user, string $code): bool
    {
        try {
            $response = Http::withHeaders([
                'api-key' => config('services.brevo.api_key'),
                'Content-Type' => 'application/json',
            ])->post('https://api.brevo.com/v3/smtp/email', [
                'sender' => [
                    'email' => config('services.brevo.sender_email'),
                    'name' => config('services.brevo.sender_name'),
                ],
                'to' => [
                    ['email' => $user->email, 'name' => $user->name],
                ],
                'subject' => 'Tu código de verificación',
                'htmlContent' => "<p>Tu código de verificación es: <strong>{$code}</strong></p>".
                    '<p>Vence en 10 minutos. Si no fuiste tú, ignora este mensaje.</p>',
            ]);

            if ($response->failed()) {
                // Se loguea el motivo del fallo, pero NUNCA el código ni
                // ningún otro dato sensible — solo metadatos (quién, qué pasó).
                Log::warning('Brevo: fallo al enviar código 2FA', [
                    'user_id' => $user->id,
                    'status' => $response->status(),
                ]);

                return false;
            }

            return true;
        } catch (Throwable $e) {
            // Cubre errores de red/timeout/etc. (no solo respuestas HTTP de error).
            Log::warning('Brevo: excepción al enviar código 2FA', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
