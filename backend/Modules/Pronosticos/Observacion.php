<?php

namespace Modules\Pronosticos;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Productos\Producto;

class Observacion extends Model
{
    use SoftDeletes;

    // Eloquent pluraliza "Observacion" al estilo inglés ("observacions"),
    // no "observaciones" — se declara a mano en vez de depender de esa
    // adivinanza.
    protected $table = 'observaciones';

    protected $fillable = [
        'producto_id',
        'periodo',
        'cantidad',
        // Quién hizo la última mutación — lo lee el trigger de auditoría
        // (ver database/migrations/..._create_triggers_auditoria_observaciones.php).
        'actor_id',
    ];

    protected function casts(): array
    {
        return [
            'periodo' => 'date',
        ];
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }
}
