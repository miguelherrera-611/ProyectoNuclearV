<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

// Un solo endpoint para lo que el Dashboard antes armaba pidiendo, por cada
// producto activo, los 5 métodos por separado (N*5 llamadas HTTP en cada
// carga de "Inicio") — ver /pronosticos/resumen en routes.php.
class ResumenPronosticoTest extends TestCase
{
    use RefreshDatabase;

    private function productoConObservaciones(array $demandas, bool $activo = true): Producto
    {
        $producto = Producto::factory()->create(['activo' => $activo]);

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
    public function devuelve_el_metodo_con_menor_mad_por_producto_activo(): void
    {
        $gerente = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $producto = $this->productoConObservaciones([50, 65, 52, 56, 55, 60, 58, 61, 59, 65]);
        $token = $gerente->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/pronosticos/resumen');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($producto->id, $response->json('data.0.producto.id'));
        // De los 5 métodos por defecto, el ponderado (pesos 0.4/0.6) es el
        // que da menor MAD (2.625) para este histórico — confirmado
        // calculando los 5 directamente contra las clases.
        $this->assertSame('promedio_movil_ponderado', $response->json('data.0.metodo'));
        $this->assertEqualsWithDelta(2.625, $response->json('data.0.resultado.metricas.mad'), 0.0001);
    }

    #[Test]
    public function no_incluye_productos_inactivos(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $this->productoConObservaciones([50, 65, 52, 56, 55, 60, 58, 61, 59, 65], activo: false);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/pronosticos/resumen')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    #[Test]
    public function omite_sin_error_un_producto_sin_historico_suficiente(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $this->productoConObservaciones([50]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/pronosticos/resumen')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    #[Test]
    public function requiere_autenticacion(): void
    {
        $this->getJson('/api/pronosticos/resumen')->assertUnauthorized();
    }
}
