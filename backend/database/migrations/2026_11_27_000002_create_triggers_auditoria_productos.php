<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Reemplaza las llamadas a Auditoria::registrar() que antes vivían en
// ProductoController (crear/editar/eliminar) — ahora las dispara la propia
// base de datos cuando la fila cambia, sin importar por dónde se haya
// escrito (controlador, tinker, un seeder futuro...). "restaurar" también
// queda cubierto acá, aunque hoy solo lo dispara PapeleraController.
//
// Local/tests usan SQLite, producción usa MySQL — la sintaxis de triggers
// es distinta en cada uno, así que esta migración escribe las dos.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->upSqlite();
        } else {
            $this->upMysql();
        }
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS productos_auditoria_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS productos_auditoria_update');
    }

    private function upSqlite(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER productos_auditoria_insert
            AFTER INSERT ON productos
            FOR EACH ROW
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id, 'crear', 'Producto', NEW.id,
                    'Creó el producto ' || NEW.codigo || ' (' || NEW.nombre || ')',
                    CURRENT_TIMESTAMP
                );
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER productos_auditoria_update
            AFTER UPDATE ON productos
            FOR EACH ROW
            WHEN
                (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL
                    AND (NEW.codigo <> OLD.codigo OR NEW.nombre <> OLD.nombre))
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'eliminar'
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'restaurar'
                        ELSE 'editar'
                    END,
                    'Producto',
                    NEW.id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
                            THEN 'Eliminó el producto ' || NEW.codigo || ' (' || NEW.nombre || ')'
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL
                            THEN 'Restauró el producto ' || NEW.codigo || ' (' || NEW.nombre || ')'
                        ELSE 'Editó el producto ' || NEW.codigo || ' (' || NEW.nombre || ')'
                    END,
                    CURRENT_TIMESTAMP
                );
            END
        SQL);
    }

    private function upMysql(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER productos_auditoria_insert
            AFTER INSERT ON productos
            FOR EACH ROW
            INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
            VALUES (
                NEW.actor_id, 'crear', 'Producto', NEW.id,
                CONCAT('Creó el producto ', NEW.codigo, ' (', NEW.nombre, ')'),
                NOW()
            )
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER productos_auditoria_update
            AFTER UPDATE ON productos
            FOR EACH ROW
            BEGIN
                IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'eliminar', 'Producto', NEW.id,
                        CONCAT('Eliminó el producto ', NEW.codigo, ' (', NEW.nombre, ')'), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'restaurar', 'Producto', NEW.id,
                        CONCAT('Restauró el producto ', NEW.codigo, ' (', NEW.nombre, ')'), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL
                        AND (NEW.codigo <> OLD.codigo OR NEW.nombre <> OLD.nombre)) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'editar', 'Producto', NEW.id,
                        CONCAT('Editó el producto ', NEW.codigo, ' (', NEW.nombre, ')'), NOW());
                END IF;
            END
        SQL);
    }
};
