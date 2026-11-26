<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ObservacionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function gerente_no_puede_capturar_una_observacion(): void
    {
        $gerente = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $producto = Producto::factory()->create();
        $token = $gerente->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/observaciones', [
                'producto_id' => $producto->id,
                'periodo' => '2024-01-01',
                'cantidad' => 50,
            ])
            ->assertStatus(403);

        $this->assertDatabaseCount('observaciones', 0);
    }

    #[Test]
    public function administrador_puede_capturar_y_corregir_una_observacion(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $producto = Producto::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/observaciones', [
                'producto_id' => $producto->id,
                'periodo' => '2024-01-01',
                'cantidad' => 50,
            ])
            ->assertStatus(201);

        // Volver a mandar el mismo producto+periodo corrige la cantidad en
        // vez de crear un duplicado.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/observaciones', [
                'producto_id' => $producto->id,
                'periodo' => '2024-01-01',
                'cantidad' => 75,
            ])
            ->assertStatus(201);

        $this->assertDatabaseCount('observaciones', 1);
        $this->assertDatabaseHas('observaciones', ['producto_id' => $producto->id, 'cantidad' => 75]);
    }

    #[Test]
    public function el_permiso_es_por_persona_no_por_rol(): void
    {
        // Un gerente con este permiso puntual sí puede, aunque el default de
        // su rol no lo traiga.
        $gerente = User::factory()->create([
            'role' => User::ROLE_GERENTE,
            'permisos' => ['pronostico.calcular', 'observaciones.capturar'],
        ]);
        $producto = Producto::factory()->create();
        $token = $gerente->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/observaciones', [
                'producto_id' => $producto->id,
                'periodo' => '2024-01-01',
                'cantidad' => 50,
            ])
            ->assertStatus(201);
    }
}
