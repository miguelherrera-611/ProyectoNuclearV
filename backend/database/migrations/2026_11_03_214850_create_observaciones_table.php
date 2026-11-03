<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            // Primer día del mes que representa el periodo — así ordena y
            // compara de forma natural sin inventar un formato propio.
            $table->date('periodo');
            $table->unsignedInteger('cantidad');
            $table->timestamps();

            // Un producto no puede tener dos observaciones para el mismo mes.
            $table->unique(['producto_id', 'periodo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observaciones');
    }
};
