<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CalcularPronosticoMetodosTest extends TestCase
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

    private function token(string $role = User::ROLE_GERENTE): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    #[Test]
    public function calcula_el_promedio_movil_ponderado(): void
    {
        $producto = $this->productoConHistorico();

        $response = $this->withHeader('Authorization', "Bearer {$this->token()}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'promedio_movil_ponderado',
                'pesos' => [0.4, 0.6],
            ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(2.625, $response->json('data.metricas.mad'), 0.01);
        $this->assertEqualsWithDelta(4.50, $response->json('data.metricas.mape'), 0.01);
    }

    #[Test]
    public function calcula_el_suavizamiento_exponencial(): void
    {
        $producto = $this->productoConHistorico();

        $response = $this->withHeader('Authorization', "Bearer {$this->token()}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'suavizamiento_exponencial',
                'alpha' => 0.45,
            ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(3.7, $response->json('data.metricas.mad'), 0.01);
        $this->assertEqualsWithDelta(6.03, $response->json('data.metricas.mape'), 0.01);
    }

    #[Test]
    public function rechaza_pesos_que_no_suman_1_con_422(): void
    {
        $producto = $this->productoConHistorico();

        $this->withHeader('Authorization', "Bearer {$this->token()}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'promedio_movil_ponderado',
                'pesos' => [0.5, 0.6],
            ])
            ->assertStatus(422);
    }

    #[Test]
    public function rechaza_alpha_fuera_de_rango_con_422(): void
    {
        $producto = $this->productoConHistorico();

        $this->withHeader('Authorization', "Bearer {$this->token()}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'suavizamiento_exponencial',
                'alpha' => 1.5,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('alpha');
    }

    #[Test]
    public function rechaza_un_metodo_desconocido(): void
    {
        $producto = $this->productoConHistorico();

        $this->withHeader('Authorization', "Bearer {$this->token()}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'holt',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('metodo');
    }
}
