<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Solo 2 roles en este recorte del proyecto (ver Requisitos_JR_Forecast.docx,
            // que define 4 — "administrador" acá une Administrador+Planeador+Analista,
            // "gerente" es el único de solo lectura, equivalente al Supervisor del documento).
            $table->enum('role', ['administrador', 'gerente'])->default('gerente')->after('password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
