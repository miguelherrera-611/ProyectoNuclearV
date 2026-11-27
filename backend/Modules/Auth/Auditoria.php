<?php

namespace Modules\Auth;

use Illuminate\Database\Eloquent\Model;

// Historial de acciones administrativas (crear/editar/eliminar/restaurar
// sobre Productos, Observaciones y Usuarios) — distinto de LoginAudit, que
// es específicamente el rastro de login/2FA.
class Auditoria extends Model
{
    protected $table = 'auditorias';

    // Log inmutable: no tiene sentido un updated_at.
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'accion',
        'entidad',
        'entidad_id',
        'descripcion',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // $usuarioId explícito y nullable (no siempre request()->user(), ej. la
    // purga automática corre por consola, sin usuario autenticado).
    public static function registrar(
        string $accion,
        string $entidad,
        ?int $entidadId,
        string $descripcion,
        ?int $usuarioId = null,
        array $meta = [],
    ): self {
        return static::create([
            'user_id' => $usuarioId ?? request()?->user()?->id,
            'accion' => $accion,
            'entidad' => $entidad,
            'entidad_id' => $entidadId,
            'descripcion' => $descripcion,
            'meta' => $meta,
        ]);
    }
}
