<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
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

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'role' => ['required', 'string', Rule::in([User::ROLE_ADMINISTRADOR, User::ROLE_GERENTE])],
        ]);

        // El cast "hashed" del modelo (User::casts()) guarda el bcrypt solo;
        // nunca el texto plano llega a la base de datos.
        $usuario = User::create($data);

        return response()->json(['data' => new UserResource($usuario)], 201);
    }
}
