<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Modules\Auth\User;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Sin pantalla de registro todavía — usuario de prueba para
        // desarrollo (test@example.com / password). Cambiar o borrar antes
        // de producción.
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'role' => User::ROLE_ADMINISTRADOR,
        ]);

        // Productos reales del histórico del cliente (Requisitos_JR_Forecast.docx)
        // — ObservacionesSeeder crea cada producto con firstOrCreate() antes de
        // cargarle su histórico, no hace falta repetirlo acá.
        $this->call(ObservacionesSeeder::class);
    }
}
