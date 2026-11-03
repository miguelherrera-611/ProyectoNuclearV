<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Productos\Producto;

/**
 * @extends Factory<Producto>
 */
class ProductoFactory extends Factory
{
    // Misma razón que UserFactory: el modelo vive bajo Modules\Productos\,
    // no bajo App\, así que la adivinanza automática de Laravel no sirve.
    protected $model = Producto::class;

    public function definition(): array
    {
        return [
            'codigo' => fake()->unique()->bothify('PROD-###'),
            'nombre' => fake()->words(3, true),
            'activo' => true,
        ];
    }
}
