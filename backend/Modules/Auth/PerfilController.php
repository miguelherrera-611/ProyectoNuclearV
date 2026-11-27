<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

// Separado de UsuarioController a propósito: ese es "el administrador
// administra OTRAS cuentas"; este es "cualquier usuario autenticado edita la
// SUYA" — no necesita ningún permiso puntual, aplica igual a administrador y
// gerente.
class PerfilController
{
    public function actualizar(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $usuario = $request->user();
        $usuario->update(['name' => $data['name']]);

        Auditoria::registrar('editar', 'Usuario', $usuario->id, 'Actualizó su nombre.');

        return response()->json(['data' => new UserResource($usuario)]);
    }

    public function subirAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $usuario = $request->user();

        if ($usuario->avatar_path) {
            Storage::disk('public')->delete($usuario->avatar_path);
        }

        $usuario->avatar_path = $request->file('avatar')->store('avatars', 'public');
        $usuario->save();

        Auditoria::registrar('editar', 'Usuario', $usuario->id, 'Cambió su foto de perfil.');

        return response()->json(['data' => new UserResource($usuario)]);
    }

    public function cambiarPassword(Request $request)
    {
        $data = $request->validate([
            'password_actual' => ['required', 'string'],
            'password_nueva' => ['required', 'string', Password::min(8)],
        ]);

        $usuario = $request->user();

        if (! Hash::check($data['password_actual'], $usuario->password)) {
            return response()->json(['message' => 'La contraseña actual no es correcta.'], 422);
        }

        $usuario->password = $data['password_nueva'];
        $usuario->save();

        Auditoria::registrar('editar', 'Usuario', $usuario->id, 'Cambió su contraseña.');

        return response()->noContent();
    }

    // Paso 1 de 2 para cambiar de correo: el código se manda al correo QUE
    // YA TIENE (no al nuevo) — es la prueba de que quien pide el cambio es
    // de verdad el dueño de la cuenta, no alguien que adivinó la contraseña
    // de otro. El correo nuevo queda guardado en el challenge hasta que se
    // confirme con confirmarCambioCorreo().
    public function solicitarCambioCorreo(Request $request)
    {
        $usuario = $request->user();

        $data = $request->validate([
            'nuevo_correo' => [
                'required', 'email', 'max:150',
                Rule::unique('users', 'email')->ignore($usuario->id),
            ],
        ]);

        if ($data['nuevo_correo'] === $usuario->email) {
            return response()->json(['message' => 'Ese ya es tu correo actual.'], 422);
        }

        $challenge = $usuario->generateTwoFactorChallenge('email_change', ['nuevo_correo' => $data['nuevo_correo']]);

        $sent = app(BrevoMailer::class)->sendTwoFactorCode($usuario, $challenge['code']);

        LoginAudit::record('email_change_requested', [
            'email' => $usuario->email,
            'user_id' => $usuario->id,
            'meta' => ['nuevo_correo' => $data['nuevo_correo'], 'delivered' => $sent],
        ]);

        $response = ['data' => ['challenge_token' => $challenge['token']]];

        if (app()->environment(['local', 'testing'])) {
            $response['data']['dev_code'] = $challenge['code'];
        }

        return response()->json($response);
    }

    public function confirmarCambioCorreo(Request $request)
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $usuario = $request->user();

        // El challenge es del propio usuario autenticado: a diferencia del
        // login o de "olvidé mi contraseña" (sin sesión todavía, hay que
        // buscar a quién pertenece el token), acá ya se sabe quién es —
        // solo falta comprobar que el token es justo el que se le mandó a
        // ÉL y que sigue siendo para un cambio de correo.
        if (
            $usuario->two_factor_challenge_token !== $data['challenge_token']
            || $usuario->two_factor_purpose !== 'email_change'
        ) {
            return response()->json(['message' => 'Código inválido o expirado.'], 422);
        }

        $nuevoCorreo = $usuario->two_factor_payload['nuevo_correo'] ?? null;

        if (! $nuevoCorreo || ! $usuario->verifyTwoFactorCode($data['code'])) {
            return response()->json(['message' => 'Código inválido o expirado.'], 422);
        }

        $correoAnterior = $usuario->email;
        $usuario->email = $nuevoCorreo;
        $usuario->save();

        Auditoria::registrar('editar', 'Usuario', $usuario->id, "Cambió su correo de {$correoAnterior} a {$nuevoCorreo}.");

        return response()->json(['data' => new UserResource($usuario)]);
    }
}
