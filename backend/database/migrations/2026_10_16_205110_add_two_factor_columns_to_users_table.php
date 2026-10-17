<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Migración NUEVA (no se tocó la migración original de "users") porque en
 * este proyecto una migración que ya corrió nunca se edita — si hace falta
 * cambiar una tabla existente, se agrega una migración aparte.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Nunca se guarda el código en texto plano — acá va su hash.
            $table->string('two_factor_code')->nullable()->after('password');
            // Identificador aleatorio que el frontend usa en el paso 2 para
            // decir "este código es para este usuario", sin reenviar el correo.
            $table->string('two_factor_challenge_token')->nullable()->unique()->after('two_factor_code');
            // El código vence 10 minutos después de generado.
            $table->timestamp('two_factor_expires_at')->nullable()->after('two_factor_challenge_token');
            // Cuenta los intentos fallidos para bloquear el código tras 5 intentos.
            $table->unsignedTinyInteger('two_factor_attempts')->default(0)->after('two_factor_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_code',
                'two_factor_challenge_token',
                'two_factor_expires_at',
                'two_factor_attempts',
            ]);
        });
    }
};
