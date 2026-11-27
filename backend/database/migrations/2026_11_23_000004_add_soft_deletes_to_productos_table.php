<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Unifica "dar de baja" (el booleano "activo") con la papelera general:
// de ahora en adelante un producto dado de baja ES un producto eliminado
// (deleted_at), restaurable desde la misma pantalla que Observaciones y
// Usuarios — un producto inactivo bajo el esquema viejo no debe reaparecer
// como si nunca se hubiera dado de baja, por eso el backfill antes de
// borrar la columna.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->softDeletes();
        });

        DB::table('productos')->where('activo', false)->update(['deleted_at' => now()]);

        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('activo');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('activo')->default(true);
        });

        DB::table('productos')->whereNotNull('deleted_at')->update(['activo' => false]);

        Schema::table('productos', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
