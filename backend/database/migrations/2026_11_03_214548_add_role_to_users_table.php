<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Solo 2 de los 4 roles del documento de requisitos:
            // "administrador" une Administrador+Planeador+Analista,
            // "gerente" (solo lectura) equivale al Supervisor.
            $table->enum('role', ['administrador', 'gerente'])->default('gerente')->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
