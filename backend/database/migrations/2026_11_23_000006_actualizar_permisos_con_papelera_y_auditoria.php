<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Modules\Auth\Permisos;
use Modules\Auth\User;

// Dos cosas sobre los permisos YA guardados de cada usuario (los nuevos
// que se creen de acá en adelante ya salen bien del catálogo actual):
// 1. "productos.dar_de_baja" se renombró a "productos.eliminar" (ahora
//    dar de baja es de verdad un soft delete) — quien lo tenía, lo sigue
//    teniendo con el nombre nuevo.
// 2. A quien ya tenía TODOS los permisos de administrador se le agregan los
//    nuevos (papelera.*, auditoria.ver, usuarios.eliminar) — si antes podía
//    hacer de todo, debe poder seguir haciendo de todo con lo que se agregó.
return new class extends Migration
{
    public function up(): void
    {
        $nuevosDeAdmin = Permisos::DEFAULT_POR_ROL[User::ROLE_ADMINISTRADOR];

        foreach (DB::table('users')->whereNotNull('permisos')->get(['id', 'role', 'permisos']) as $fila) {
            $permisos = json_decode($fila->permisos, true) ?? [];

            $permisos = array_map(
                fn ($clave) => $clave === 'productos.dar_de_baja' ? 'productos.eliminar' : $clave,
                $permisos,
            );

            $teniaTodoElAntiguoSetDeAdmin = $fila->role === User::ROLE_ADMINISTRADOR
                && empty(array_diff(['productos.crear', 'productos.editar', 'usuarios.ver', 'usuarios.crear'], $permisos));

            if ($teniaTodoElAntiguoSetDeAdmin) {
                $permisos = array_values(array_unique([...$permisos, ...$nuevosDeAdmin]));
            } else {
                $permisos = array_values(array_unique($permisos));
            }

            DB::table('users')->where('id', $fila->id)->update(['permisos' => json_encode($permisos)]);
        }
    }

    public function down(): void
    {
        // No se revierte: es una limpieza de datos, no tiene sentido volver
        // a dejar nombres de permisos que ya no existen en el catálogo.
    }
};
