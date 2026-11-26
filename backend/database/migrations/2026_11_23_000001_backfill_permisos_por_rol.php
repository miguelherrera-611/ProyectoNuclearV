<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Modules\Auth\Permisos;

// La migración anterior (add_permisos_to_users_table) solo agregó la
// columna — las cuentas que ya existían se quedaron con permisos=null, lo
// que las deja sin poder hacer nada (Gate::define revisa tienePermiso(),
// que con null siempre da false). Esto les da, una sola vez, los defaults
// de su rol actual; de ahí en adelante vuelven a ser propios de cada quien.
return new class extends Migration
{
    public function up(): void
    {
        foreach (Permisos::DEFAULT_POR_ROL as $rol => $permisos) {
            DB::table('users')
                ->where('role', $rol)
                ->whereNull('permisos')
                ->update(['permisos' => json_encode($permisos)]);
        }
    }

    public function down(): void
    {
        // No se revierte: dejar "permisos" en null de nuevo le quitaría el
        // acceso a cuentas que ya estaban funcionando antes de este cambio.
    }
};
