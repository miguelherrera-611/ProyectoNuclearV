<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

// Separado de AuthController a propósito: ese es el flujo de login/2FA de
// "quien ya tiene cuenta entra"; este es "el administrador administra
// cuentas" — dos responsabilidades distintas aunque compartan el modelo.
class UsuarioController
{
    public function index()
    {
        return response()->json([
            'data' => UserResource::collection(User::orderBy('name')->get()),
        ]);
    }

    // Catálogo de permisos + lo que trae cada rol por defecto, para que el
    // frontend pinte el checklist sin tener la lista hardcodeada aparte
    // (y sin arriesgarse a que se desincronice con el backend).
    public function catalogoPermisos()
    {
        return response()->json([
            'data' => [
                'permisos' => Permisos::TODAS,
                'default_por_rol' => Permisos::DEFAULT_POR_ROL,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->decodificarPermisosSiVienenComoTexto($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'role' => ['required', 'string', Rule::in([User::ROLE_ADMINISTRADOR, User::ROLE_GERENTE])],
            'permisos' => ['sometimes', 'array'],
            'permisos.*' => ['string'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ]);

        // Si no mandan permisos explícitos, arranca con los del rol — pero
        // de ahí en adelante son propios de este usuario (ver Permisos).
        $permisos = Permisos::filtrarValidas($data['permisos'] ?? Permisos::defaultParaRol($data['role']));

        $usuario = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'permisos' => $permisos,
        ]);

        if ($request->hasFile('avatar')) {
            $usuario->update(['avatar_path' => $request->file('avatar')->store('avatars', 'public')]);
        }

        Auditoria::registrar('crear', 'Usuario', $usuario->id, "Creó al usuario {$usuario->email} ({$usuario->role})");

        return response()->json(['data' => new UserResource($usuario)], 201);
    }

    public function update(Request $request, User $usuario)
    {
        $this->decodificarPermisosSiVienenComoTexto($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($usuario->id)],
            // Al editar, la contraseña es opcional: vacío = se deja la que ya tenía.
            'password' => ['nullable', 'string', Password::min(8)],
            'role' => ['required', 'string', Rule::in([User::ROLE_ADMINISTRADOR, User::ROLE_GERENTE])],
            'permisos' => ['sometimes', 'array'],
            'permisos.*' => ['string'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ]);

        $permisos = Permisos::filtrarValidas($data['permisos'] ?? Permisos::defaultParaRol($data['role']));

        $usuario->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'permisos' => $permisos,
        ]);

        if (! empty($data['password'])) {
            $usuario->password = $data['password'];
        }

        if ($request->hasFile('avatar')) {
            if ($usuario->avatar_path) {
                Storage::disk('public')->delete($usuario->avatar_path);
            }
            $usuario->avatar_path = $request->file('avatar')->store('avatars', 'public');
        }

        $usuario->save();

        Auditoria::registrar('editar', 'Usuario', $usuario->id, "Editó al usuario {$usuario->email} ({$usuario->role})");

        return response()->json(['data' => new UserResource($usuario)]);
    }

    // El formulario de Usuarios manda "permisos" como array JSON normal
    // cuando no hay foto (petición JSON de siempre), pero como string con
    // JSON.stringify cuando hay que subir un archivo (multipart no sabe
    // mandar un array de otra forma sin ensuciarlo con "permisos[]"). Si
    // llega como texto, se decodifica antes de validar — así el resto del
    // método no necesita saber cuál de los dos casos fue.
    private function decodificarPermisosSiVienenComoTexto(Request $request): void
    {
        if (is_string($request->input('permisos'))) {
            $request->merge(['permisos' => json_decode($request->input('permisos'), true) ?? []]);
        }
    }

    // Soft delete: queda restaurable desde la papelera
    // (Modules\Auth\PapeleraController). Nunca te puedes eliminar a ti
    // mismo — si no, quien lo haga por error se queda sin forma de entrar
    // de nuevo a revertirlo.
    public function destroy(Request $request, User $usuario)
    {
        if ($usuario->id === $request->user()->id) {
            return response()->json([
                'message' => 'No puedes eliminar tu propia cuenta.',
            ], 422);
        }

        Auditoria::registrar('eliminar', 'Usuario', $usuario->id, "Eliminó al usuario {$usuario->email}");

        // Revoca cualquier sesión activa de la cuenta eliminada.
        $usuario->tokens()->delete();
        $usuario->delete();

        return response()->noContent();
    }
}
