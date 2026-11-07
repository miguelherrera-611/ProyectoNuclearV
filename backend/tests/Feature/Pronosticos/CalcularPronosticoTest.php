<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CalcularPronosticoTest extends TestCase
{
    use RefreshDatabase;

    private function productoConHistorico(): Producto
    {
        $producto = Producto::factory()->create();
        $demandas = [50, 65, 52, 56, 55, 60, 58, 61, 59, 65];

        foreach ($demandas as $i => $cantidad) {
            Observacion::create([
                'producto_id' => $producto->id,
                'periodo' => sprintf('2024-%02d-01', $i + 1),
                'cantidad' => $cantidad,
            ]);
        }

        return $producto;
    }

    #[Test]
    public function gerente_tambien_puede_calcular_un_pronostico_porque_no_modifica_datos(): void
    {
        $gerente = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $producto = $this->productoConHistorico();
        $token = $gerente->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/pronosticos/calcular', ['producto_id' => $producto->id, 'n' => 2]);

        $response->assertOk();
        $this->assertEqualsWithDelta(2.69, $response->json('data.metricas.mad'), 0.01);
        $this->assertEqualsWithDelta(4.63, $response->json('data.metricas.mape'), 0.01);
    }

    #[Test]
    public function rechaza_n_mayor_o_igual_a_los_periodos_capturados(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $producto = $this->productoConHistorico();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/pronosticos/calcular', ['producto_id' => $producto->id, 'n' => 10])
            ->assertStatus(422);
    }
}
