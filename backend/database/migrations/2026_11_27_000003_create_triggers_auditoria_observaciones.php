<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Mismo criterio que la migración de productos — ver ese archivo para la
// explicación completa.
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
        DB::unprepared('DROP TRIGGER IF EXISTS observaciones_auditoria_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS observaciones_auditoria_update');
    }

    private function upSqlite(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER observaciones_auditoria_insert
            AFTER INSERT ON observaciones
            FOR EACH ROW
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id, 'crear', 'Observacion', NEW.id,
                    'Capturó la observación de ' || NEW.periodo || ' (' || NEW.cantidad || ' u, producto #' || NEW.producto_id || ')',
                    CURRENT_TIMESTAMP
                );
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER observaciones_auditoria_update
            AFTER UPDATE ON observaciones
            FOR EACH ROW
            WHEN
                (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL AND NEW.cantidad <> OLD.cantidad)
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'eliminar'
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'restaurar'
                        ELSE 'editar'
                    END,
                    'Observacion',
                    NEW.id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
                            THEN 'Eliminó la observación de ' || NEW.periodo || ' (producto #' || NEW.producto_id || ')'
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL
                            THEN 'Restauró la observación de ' || NEW.periodo || ' (producto #' || NEW.producto_id || ')'
                        ELSE 'Corrigió la observación de ' || NEW.periodo || ' a ' || NEW.cantidad || ' u (producto #' || NEW.producto_id || ')'
                    END,
                    CURRENT_TIMESTAMP
                );
            END
        SQL);
    }

    private function upMysql(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER observaciones_auditoria_insert
            AFTER INSERT ON observaciones
            FOR EACH ROW
            INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
            VALUES (
                NEW.actor_id, 'crear', 'Observacion', NEW.id,
                CONCAT('Capturó la observación de ', NEW.periodo, ' (', NEW.cantidad, ' u, producto #', NEW.producto_id, ')'),
                NOW()
            )
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER observaciones_auditoria_update
            AFTER UPDATE ON observaciones
            FOR EACH ROW
            BEGIN
                IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'eliminar', 'Observacion', NEW.id,
                        CONCAT('Eliminó la observación de ', NEW.periodo, ' (producto #', NEW.producto_id, ')'), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'restaurar', 'Observacion', NEW.id,
                        CONCAT('Restauró la observación de ', NEW.periodo, ' (producto #', NEW.producto_id, ')'), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL AND NEW.cantidad <> OLD.cantidad) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'editar', 'Observacion', NEW.id,
                        CONCAT('Corrigió la observación de ', NEW.periodo, ' a ', NEW.cantidad, ' u (producto #', NEW.producto_id, ')'), NOW());
                END IF;
            END
        SQL);
    }
};
