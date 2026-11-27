<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Mismo criterio que la migración de productos — ver ese archivo para la
// explicación completa. "editar" también cubre cambios solo de permisos
// (sin tocar nombre/correo/rol) — es el caso más común e importante de
// auditar en la matriz de permisos por usuario.
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
        DB::unprepared('DROP TRIGGER IF EXISTS users_auditoria_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS users_auditoria_update');
    }

    private function upSqlite(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER users_auditoria_insert
            AFTER INSERT ON users
            FOR EACH ROW
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id, 'crear', 'Usuario', NEW.id,
                    'Creó al usuario ' || NEW.email || ' (' || NEW.role || ')',
                    CURRENT_TIMESTAMP
                );
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER users_auditoria_update
            AFTER UPDATE ON users
            FOR EACH ROW
            WHEN
                (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL)
                OR (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL
                    AND (NEW.name <> OLD.name OR NEW.email <> OLD.email OR NEW.role <> OLD.role
                         OR NEW.permisos <> OLD.permisos OR COALESCE(NEW.avatar_path, '') <> COALESCE(OLD.avatar_path, '')))
            BEGIN
                INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                VALUES (
                    NEW.actor_id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'eliminar'
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'restaurar'
                        ELSE 'editar'
                    END,
                    'Usuario',
                    NEW.id,
                    CASE
                        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'Eliminó al usuario ' || NEW.email
                        WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'Restauró al usuario ' || NEW.email
                        ELSE 'Editó al usuario ' || NEW.email || ' (' || NEW.role || ')'
                    END,
                    CURRENT_TIMESTAMP
                );
            END
        SQL);
    }

    private function upMysql(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER users_auditoria_insert
            AFTER INSERT ON users
            FOR EACH ROW
            INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
            VALUES (
                NEW.actor_id, 'crear', 'Usuario', NEW.id,
                CONCAT('Creó al usuario ', NEW.email, ' (', NEW.role, ')'),
                NOW()
            )
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER users_auditoria_update
            AFTER UPDATE ON users
            FOR EACH ROW
            BEGIN
                IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'eliminar', 'Usuario', NEW.id, CONCAT('Eliminó al usuario ', NEW.email), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'restaurar', 'Usuario', NEW.id, CONCAT('Restauró al usuario ', NEW.email), NOW());
                ELSEIF (NEW.deleted_at IS NULL AND OLD.deleted_at IS NULL
                        AND (NEW.name <> OLD.name OR NEW.email <> OLD.email OR NEW.role <> OLD.role
                             OR NEW.permisos <> OLD.permisos
                             OR COALESCE(NEW.avatar_path, '') <> COALESCE(OLD.avatar_path, ''))) THEN
                    INSERT INTO auditorias (user_id, accion, entidad, entidad_id, descripcion, created_at)
                    VALUES (NEW.actor_id, 'editar', 'Usuario', NEW.id,
                        CONCAT('Editó al usuario ', NEW.email, ' (', NEW.role, ')'), NOW());
                END IF;
            END
        SQL);
    }
};
