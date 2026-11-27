<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // Se compara SIEMPRE, exista o no el usuario (hash de relleno si
        // no existe) — si no, el tiempo de respuesta filtraría qué correos
        // están registrados.
        $passwordMatches = Hash::check(
            $data['password'],
            $user->password ?? '$2y$12$'.str_repeat('0', 53)
        );

        if (! $user || ! $passwordMatches) {
            // Mensaje genérico a propósito: nunca distinguir "correo no
            // existe" de "contraseña incorrecta" (enumeración de usuarios).
            LoginAudit::record('login_failed', ['email' => $data['email']]);

            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 422);
        }

        if (! config('auth.two_factor_enabled')) {
            // Interruptor temporal (ver config/auth.php): entrega el token
            // directo, sin pedir el código por correo. Se audita igual,
            // para dejar rastro de que este login salió sin 2FA.
            $token = $user->createToken('web')->plainTextToken;

            LoginAudit::record('login_success_2fa_disabled', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'data' => ['token' => $token],
            ]);
        }

        $challenge = $user->generateTwoFactorChallenge();

        $sent = app(BrevoMailer::class)->sendTwoFactorCode($user, $challenge['code']);

        LoginAudit::record('otp_sent', [
            'email' => $user->email,
            'user_id' => $user->id,
            'meta' => ['delivered' => $sent],
        ]);

        $response = [
            'data' => [
                'two_factor_required' => true,
                'challenge_token' => $challenge['token'],
            ],
        ];

        // Mientras no haya API key real de Brevo: en local y en testing
        // (para que las pruebas automatizadas puedan correr el flujo
        // completo) se expone el código en texto plano. Nunca en producción.
        if (app()->environment(['local', 'testing'])) {
            $response['data']['dev_code'] = $challenge['code'];
        }

        return response()->json($response);
    }

    public function verifyTwoFactor(Request $request)
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $user = User::where('two_factor_challenge_token', $data['challenge_token'])->first();

        if (! $user) {
            LoginAudit::record('otp_failed', [
                'meta' => ['reason' => 'unrecognized_challenge_token'],
            ]);

            return response()->json([
                'message' => 'Código inválido o expirado.',
            ], 422);
        }

        if (! $user->verifyTwoFactorCode($data['code'])) {
            LoginAudit::record('otp_failed', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Código inválido o expirado.',
            ], 422);
        }

        $token = $user->createToken('web')->plainTextToken;

        LoginAudit::record('otp_verified', [
            'email' => $user->email,
            'user_id' => $user->id,
        ]);

        // Solo el token: quién es el usuario lo resuelve el frontend
        // llamando a GET /api/auth/me aparte — responsabilidad única, este
        // endpoint solo autentica (igual que /token vs /userinfo en OAuth).
        return response()->json([
            'data' => [
                'token' => $token,
            ],
        ]);
    }

    // "purpose" = 'password_reset' en el challenge (User::
    // generateTwoFactorChallenge) es lo único que distingue este código del
    // de login — así uno no sirve para el otro aunque compartan las mismas
    // columnas. Responde siempre igual, exista o no el correo (nunca se
    // revela qué cuentas existen); si no existe, el token que se entrega no
    // quedó guardado en ningún usuario y el siguiente paso simplemente va a
    // fallar con "código inválido".
    public function olvidePassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        $response = [
            'data' => [
                'message' => 'Si el correo está registrado, te enviamos un código para continuar.',
                'challenge_token' => Str::random(40),
            ],
        ];

        if ($user) {
            $challenge = $user->generateTwoFactorChallenge('password_reset');
            $response['data']['challenge_token'] = $challenge['token'];

            $sent = app(BrevoMailer::class)->sendTwoFactorCode($user, $challenge['code']);

            LoginAudit::record('password_reset_requested', [
                'email' => $user->email,
                'user_id' => $user->id,
                'meta' => ['delivered' => $sent],
            ]);

            if (app()->environment(['local', 'testing'])) {
                $response['data']['dev_code'] = $challenge['code'];
            }
        } else {
            LoginAudit::record('password_reset_requested_unknown_email', ['email' => $data['email']]);
        }

        return response()->json($response);
    }

    public function restablecerPassword(Request $request)
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
            'password_nueva' => ['required', 'string', Password::min(8)],
        ]);

        $user = User::where('two_factor_challenge_token', $data['challenge_token'])
            ->where('two_factor_purpose', 'password_reset')
            ->first();

        if (! $user || ! $user->verifyTwoFactorCode($data['code'])) {
            LoginAudit::record('password_reset_failed', $user ? ['email' => $user->email, 'user_id' => $user->id] : []);

            return response()->json([
                'message' => 'Código inválido o expirado.',
            ], 422);
        }

        $user->password = $data['password_nueva'];
        $user->save();

        // Cierra cualquier sesión que hubiera quedado abierta con la
        // contraseña anterior — quien la olvidó probablemente ya no tenía
        // ninguna, pero si alguien más la tenía abierta sin ser el dueño,
        // esto la corta.
        $user->tokens()->delete();

        LoginAudit::record('password_reset_completed', ['email' => $user->email, 'user_id' => $user->id]);

        return response()->noContent();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request)
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }
}
