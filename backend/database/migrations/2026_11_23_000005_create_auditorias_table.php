<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            // Nunca un FK estricto: el registro debe sobrevivir aunque el
            // usuario que hizo la acción se elimine después (o sea null
            // cuando la acción la disparó el sistema, ej. la purga automática).
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('accion'); // crear | editar | eliminar | restaurar | eliminar_permanente
            $table->string('entidad'); // Producto | Observacion | Usuario
            $table->unsignedBigInteger('entidad_id')->nullable();
            $table->string('descripcion');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['entidad', 'entidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias');
    }
};
