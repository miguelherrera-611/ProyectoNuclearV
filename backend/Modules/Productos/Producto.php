<?php

namespace Modules\Productos;

use Database\Factories\ProductoFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'codigo',
        'nombre',
        // Quién hizo la última mutación — lo lee el trigger de auditoría
        // (ver database/migrations/..._create_triggers_auditoria_productos.php),
        // no es un dato del negocio.
        'actor_id',
    ];

    // Misma razón que en Modules\Auth\User: la resolución automática de
    // factory asume namespace `App\`, y este modelo vive bajo `Modules\`.
    protected static function newFactory(): Factory
    {
        return ProductoFactory::new();
    }
}
