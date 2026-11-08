<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RegresionLinealTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function calcula_regresion_lineal_por_http(): void
    {
        $producto = Producto::factory()->create();
        $demandas = [50, 65, 52, 56, 55, 60, 58, 61, 59, 65];

        foreach ($demandas as $indice => $cantidad) {
            Observacion::create([
                'producto_id' => $producto->id,
                'periodo' => sprintf('2024-%02d-01', $indice + 1),
                'cantidad' => $cantidad,
            ]);
        }

        $usuario = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $token = $usuario->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/pronosticos/calcular', [
                'producto_id' => $producto->id,
                'metodo' => 'regresion_lineal',
            ]);

        $response->assertOk();
        $this->assertSame(63, $response->json('data.filas.10.pronostico'));
        $this->assertEqualsWithDelta(3.0, $response->json('data.metricas.mad'), 0.01);
    }
}
