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
                'htmlContent' => $this->plantillaCodigo($user->name, $code),
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

    // HTML de correo clásico (tablas + estilos inline): es lo único que
    // renderiza igual en Gmail, Outlook y el resto de clientes — un
    // <style> de verdad o CSS moderno (flex/grid) se ignora o se rompe en
    // varios de ellos. Mismos colores de la guía de identidad (sección 2)
    // que usa el resto de la app, solo que en hexadecimal fijo: un correo
    // no puede leer las variables CSS de index.css.
    private function plantillaCodigo(string $nombre, string $code): string
    {
        $nombre = e($nombre);
        $codigoEspaciado = implode(' ', str_split($code));

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <body style="margin:0;padding:32px 16px;background-color:#f5f2ea;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #c9cbd2;">
            <tr>
              <td style="height:6px;background-color:#303b8f;line-height:6px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;text-align:center;">
                <span style="font-size:20px;font-weight:700;color:#303b8f;letter-spacing:0.02em;">JR Forecast</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;text-align:center;color:#161a25;font-size:15px;line-height:1.5;">
                Hola, {$nombre}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 24px;text-align:center;color:#687083;font-size:14px;line-height:1.5;">
                Este es tu código de verificación para continuar:
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#f5f2ea;border:2px solid #24d9e8;border-radius:12px;padding:18px 12px;text-align:center;">
                      <span style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#303b8f;font-family:'Courier New',Courier,monospace;">{$codigoEspaciado}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;text-align:center;color:#687083;font-size:13px;line-height:1.5;">
                Vence en 10 minutos. Si no fuiste tú quien lo pidió, ignora este mensaje — tu cuenta sigue segura.
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #c9cbd2;text-align:center;color:#687083;font-size:12px;">
                JR Mecanizados Industriales · JR Forecast
              </td>
            </tr>
          </table>
        </body>
        </html>
        HTML;
    }
}
