<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// El mismo código de 6 dígitos (User::generateTwoFactorChallenge) ya sirve
// para login; estas dos columnas lo hacen servir también para "olvidé mi
// contraseña" y "cambiar de correo" sin tablas nuevas — "purpose" dice para
// qué era el código, "payload" guarda el dato pendiente (el correo nuevo,
// por ejemplo) hasta que el código se confirma.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('two_factor_purpose')->nullable()->after('two_factor_attempts');
            $table->json('two_factor_payload')->nullable()->after('two_factor_purpose');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_purpose', 'two_factor_payload']);
        });
    }
};
