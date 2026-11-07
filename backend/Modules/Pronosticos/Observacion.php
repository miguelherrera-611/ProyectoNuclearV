<?php

namespace Modules\Pronosticos;

use Illuminate\Database\Eloquent\Model;
use Modules\Productos\Producto;

class Observacion extends Model
{
    // Eloquent pluraliza "Observacion" al estilo inglés ("observacions"),
    // no "observaciones" — se declara a mano en vez de depender de esa
    // adivinanza.
    protected $table = 'observaciones';

    protected $fillable = [
        'producto_id',
        'periodo',
        'cantidad',
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
