<?php

namespace Modules\Productos;

use Database\Factories\ProductoFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo',
        'nombre',
        'activo',
    ];

    // Misma razón que en Modules\Auth\User: la resolución automática de
    // factory asume namespace `App\`, y este modelo vive bajo `Modules\`.
    protected static function newFactory(): Factory
    {
        return ProductoFactory::new();
    }

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }
}
