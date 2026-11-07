<?php

namespace Modules\Auth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

// Vive en el módulo Auth, no en una capa "Services/" compartida: es la
// dependencia externa propia de este módulo, aislada en un solo archivo.
class BrevoMailer
{
    // Devuelve bool en vez de lanzar: un fallo de Brevo no debe romper el
    // login, el controlador decide qué hacer con el resultado.
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
                Log::warning('Brevo: fallo al enviar código 2FA', [
                    'user_id' => $user->id,
                    'status' => $response->status(),
                ]);

                return false;
            }

            return true;
        } catch (Throwable $e) {
            Log::warning('Brevo: excepción al enviar código 2FA', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
