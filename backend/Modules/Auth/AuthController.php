<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Controlador del módulo Auth: valida, decide y responde él mismo (sin
 * delegar a una capa de Service aparte), siguiendo la arquitectura de
 * monolito modular del proyecto — cada módulo es una carpeta plana, sin
 * capas técnicas compartidas entre módulos.
 *
 * El login es un proceso de DOS pasos:
 *   1) login()           → valida correo+contraseña, manda un código por correo.
 *   2) verifyTwoFactor()  → valida ese código y recién ahí entrega el token de acceso.
 */
class AuthController
{
    /**
     * Paso 1 del login: valida las credenciales y, si son correctas,
     * genera y envía el código de 2FA. NO entrega ningún token todavía.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // Ojo con esto: SIEMPRE se hace la comparación de hash, exista o no
        // el usuario (si no existe, se compara contra un hash "de relleno").
        // Si se hiciera un `if (!$user) return error` ANTES de este Hash::check,
        // un atacante podría medir el tiempo de respuesta para adivinar qué
        // correos existen en el sistema (más rápido = no existe, más lento =
        // sí existe porque sí corrió el hash). Comparando siempre, el tiempo
        // de respuesta es parecido exista o no la cuenta.
        $passwordMatches = Hash::check(
            $data['password'],
            $user->password ?? '$2y$12$'.str_repeat('0', 53)
        );

        if (! $user || ! $passwordMatches) {
            // Mensaje genérico a propósito: nunca decir "ese correo no existe"
            // vs "contraseña incorrecta", porque eso le confirma a un atacante
            // qué correos sí están registrados (enumeración de usuarios).
            LoginAudit::record('login_failed', ['email' => $data['email']]);

            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 422);
        }

        // Credenciales correctas: ahora sí se genera el código 2FA.
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
                // El frontend usa este token (no el correo/contraseña) para
                // identificar a qué usuario corresponde el código en el paso 2.
                'challenge_token' => $challenge['token'],
            ],
        ];

        // Mientras no haya una API key real de Brevo, en entorno LOCAL (y en
        // "testing", para que las pruebas automatizadas puedan probar el
        // flujo completo por la API real) se manda también el código en
        // texto plano en la respuesta. Esto NUNCA pasa en producción, porque
        // ahí APP_ENV nunca es "local" ni "testing".
        if (app()->environment(['local', 'testing'])) {
            $response['data']['dev_code'] = $challenge['code'];
        }

        return response()->json($response);
    }

    /**
     * Paso 2 del login: valida el código de 2FA y, si es correcto, recién
     * ahí entrega un token de acceso (Sanctum) para el resto de la API.
     */
    public function verifyTwoFactor(Request $request)
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $user = User::where('two_factor_challenge_token', $data['challenge_token'])->first();

        if (! $user) {
            // Alguien mandó un challenge_token que no existe (adivinado,
            // copiado mal, o ya usado/expirado y limpiado). Queda registrado
            // igual, aunque no se sepa a qué usuario pertenecía el intento.
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

        // Código correcto: recién aquí se crea el token de acceso real.
        // 'web' es solo el nombre/etiqueta del token (útil si en el futuro
        // un mismo usuario tiene varios tokens, ej. uno por dispositivo).
        $token = $user->createToken('web')->plainTextToken;

        LoginAudit::record('otp_verified', [
            'email' => $user->email,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'data' => [
                'token' => $token,
                // Nunca se devuelve el modelo User crudo — siempre a través
                // de un Resource, que decide explícitamente qué campos salen.
                'user' => new UserResource($user),
            ],
        ]);
    }

    /**
     * Cierra la sesión: revoca únicamente el token que se usó en ESTA
     * petición (no todos los tokens del usuario, por si hay varios).
     * Requiere estar autenticado (ver middleware 'auth:sanctum' en routes.php).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /**
     * Devuelve los datos del usuario autenticado. Sirve como "ruta de
     * prueba": si esto responde 200 con los datos correctos, confirma que
     * el token realmente autoriza contra el backend (no solo que el login
     * "se vio bien" en el frontend).
     */
    public function me(Request $request)
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }
}
