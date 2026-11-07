<?php

namespace Modules\Auth;

use Illuminate\Database\Eloquent\Model;

// Nunca guarda el código 2FA ni la contraseña en texto plano — solo
// metadatos del evento.
class LoginAudit extends Model
{
    // Log inmutable: no tiene sentido un updated_at.
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
            'meta' => 'array',
        ];
    }

    public static function record(string $event, array $attributes = []): self
    {
        return static::create(array_merge([
            'event' => $event,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ], $attributes));
    }
}
