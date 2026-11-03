<?php

namespace Modules\Pronosticos;

use Illuminate\Database\Eloquent\Model;
use Modules\Productos\Producto;

/**
 * Un dato histórico real de demanda: cuánto se vendió/produjo de un
 * producto en un periodo (mes) dado. Es lo que alimenta los métodos de
 * pronóstico — por ahora se captura a mano (formulario), más adelante
 * puede venir de una importación de Excel (RF-09).
 */
class Observacion extends Model
{
    // Eloquent pluraliza "Observacion" al estilo inglés ("observacions"),
    // no al español ("observaciones") — se declara a mano para no
    // depender de esa adivinanza. (Trampa ya conocida, ver la bóveda.)
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
