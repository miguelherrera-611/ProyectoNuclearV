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
        Schema::create('login_audits', function (Blueprint $table) {
            $table->id();
            $table->string('event'); // login_failed, otp_sent, otp_verified, otp_failed...
            // nullable: un intento con un challenge_token inválido no tiene
            // un correo conocido al que asociarlo.
            $table->string('email')->nullable()->index();
            // nullable + nullOnDelete: si el usuario se borra algún día, el
            // historial de auditoría se conserva (solo se pierde el vínculo
            // directo al usuario), nunca se borra en cascada.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            // Espacio libre para detalles puntuales de un evento (ej. "por
            // qué" falló), sin tener que guardar nunca el código ni la clave.
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            // Índice compuesto para poder revisar rápido "¿cuántos intentos
            // tuvo este correo en los últimos minutos?" (patrón de fuerza bruta).
            $table->index(['email', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_audits');
    }
};
