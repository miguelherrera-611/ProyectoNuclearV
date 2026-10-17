<?php

namespace Modules\Auth;

use Illuminate\Database\Eloquent\Model;

/**
 * Registro de auditoría de seguridad: cada intento de login, envío de
 * código, verificación exitosa o fallida queda guardado acá (quién, qué
 * pasó, cuándo, desde dónde). Sirve para detectar fuerza bruta, enumeración
 * de usuarios, o simplemente para investigar un incidente después.
 *
 * Importante: esta tabla NUNCA guarda el código de 2FA ni la contraseña en
 * texto plano — solo metadatos del evento.
 */
class LoginAudit extends Model
{
    // Es un log inmutable (no se "edita" un registro de auditoría ya
    // escrito), así que no tiene sentido tener updated_at.
    public const UPDATED_AT = null;

    protected $fillable = [
        'event',
        'email',
        'user_id',
        'ip_address',
        'user_agent',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array', // Se guarda como JSON en la base de datos.
        ];
    }

    /**
     * Atajo para crear una fila de auditoría sin repetir en cada llamada
     * cómo sacar la IP y el user-agent de la petición actual.
     *
     * Uso: LoginAudit::record('login_failed', ['email' => $email]);
     */
    public static function record(string $event, array $attributes = []): self
    {
        return static::create(array_merge([
            'event' => $event,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ], $attributes));
    }
}
