<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Modules\Auth\User;
use Modules\Productos\Producto;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Como todavía no hay una pantalla de registro, se necesita un
        // usuario de prueba para poder probar el login. Credenciales:
        // test@example.com / password (la contraseña por defecto que pone
        // UserFactory). Solo para desarrollo — cambiar o borrar antes de
        // llevar esto a producción.
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'role' => User::ROLE_ADMINISTRADOR,
        ]);

        // Los 2 productos reales que trae el cliente en su histórico
        // (Requisitos_JR_Forecast.docx, sección 2).
        Producto::query()->firstOrCreate(
            ['codigo' => 'MICO-ACEL-001'],
            ['nombre' => 'Mico Acelerador Tornillo en Hierro', 'activo' => true],
        );

        Producto::query()->firstOrCreate(
            ['codigo' => 'MICO-CLUTCH-001'],
            ['nombre' => 'Mico Clutch Bronce Tornillo en Hierro', 'activo' => true],
        );
    }
}
