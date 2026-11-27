<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "actor_id" = quién hizo la última mutación sobre esta fila (el usuario
// autenticado de la request). No es un dato del negocio — existe solo para
// que los triggers de auditoría (ver las 3 migraciones siguientes) sepan a
// quién atribuirle la fila que insertan en "auditorias", porque un trigger
// no tiene forma de leer el usuario autenticado de la petición HTTP.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->after('nombre')->constrained('users')->nullOnDelete();
        });

        Schema::table('observaciones', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->after('cantidad')->constrained('users')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->after('avatar_path')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_id');
        });
        Schema::table('observaciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_id');
        });
    }
};
