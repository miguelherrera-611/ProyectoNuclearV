<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
