<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Permisos reales de ESTE usuario (no del rol): se siembran con
            // los valores por defecto del rol al crear/editar, pero de ahí
            // en adelante son propios — cambiar los defaults de "Gerente" no
            // mueve nada de quien ya se creó (Modules\Auth\Permisos).
            $table->json('permisos')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permisos');
        });
    }
};
