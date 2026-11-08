<?php

namespace Tests\Feature\Pronosticos;

use DateTimeImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EstacionalMultiplicativoTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    #[DataProvider('casosDelExcel')]
    public function reproduce_el_excel_por_http_sin_guardar_estimaciones(array $caso): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_GERENTE]));
        $producto = Producto::factory()->create();
        $inicio = new DateTimeImmutable('2024-01-01');
        $demandas = [...$caso['demandas'], 3100];

        foreach (array_reverse($demandas, true) as $indice => $cantidad) {
            Observacion::create([
                'producto_id' => $producto->id,
                'periodo' => $inicio->modify("+{$indice} months")->format('Y-m-d'),
                'cantidad' => $cantidad,
            ]);
        }

        $response = $this->postJson('/api/pronosticos/calcular', [
            'producto_id' => $producto->id,
            'metodo' => 'estacional_multiplicativo',
            'periodo_corte' => '2026-09',
        ]);

        $response->assertOk()
            ->assertJsonCount(48, 'data.filas')
            ->assertJsonPath('data.estacional.anio_proyectado', 2027)
            ->assertJsonPath('data.estacional.ultimo_periodo_real', '2026-09-01')
            ->assertJsonPath('data.filas.33.real', null)
            ->assertJsonPath('data.filas.47.periodo', '2027-12-01')
            ->assertJsonPath('data.metricas.n_periodos_evaluados', 36);

        $this->assertEquals($caso['proyecciones'], array_column(array_slice($response->json('data.filas'), 36), 'pronostico'));
        $this->assertEqualsWithDelta($caso['mad'], $response->json('data.metricas.mad'), 0.00005);
        $this->assertEqualsWithDelta($caso['mape'], $response->json('data.metricas.mape'), 0.00005);
        $this->assertDatabaseCount('observaciones', 34);
        $this->assertEquals(3100, Observacion::where('producto_id', $producto->id)->whereDate('periodo', '2026-10-01')->value('cantidad'));
        $this->assertFalse(Observacion::where('producto_id', $producto->id)->whereDate('periodo', '2026-11-01')->exists());
    }

    #[Test]
    public function devuelve_422_si_no_hay_historia_estacional_suficiente(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_GERENTE]));
        $producto = Producto::factory()->create();

        foreach (range(1, 12) as $mes) {
            Observacion::create([
                'producto_id' => $producto->id,
                'periodo' => sprintf('2024-%02d-01', $mes),
                'cantidad' => 10,
            ]);
        }

        $this->postJson('/api/pronosticos/calcular', [
            'producto_id' => $producto->id,
            'metodo' => 'estacional_multiplicativo',
        ])->assertUnprocessable()->assertJsonStructure(['message']);
    }

    #[Test]
    public function valida_el_mes_de_corte(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_GERENTE]));

        $this->postJson('/api/pronosticos/calcular', [
            'producto_id' => Producto::factory()->create()->id,
            'metodo' => 'estacional_multiplicativo',
            'periodo_corte' => '2026-13',
        ])->assertUnprocessable()->assertJsonValidationErrors('periodo_corte');
    }

    #[Test]
    public function requiere_autenticacion_para_el_nuevo_metodo(): void
    {
        $this->postJson('/api/pronosticos/calcular', [
            'producto_id' => Producto::factory()->create()->id,
            'metodo' => 'estacional_multiplicativo',
        ])->assertUnauthorized();
    }

    public static function casosDelExcel(): iterable
    {
        $casos = json_decode(file_get_contents(__DIR__.'/../../Fixtures/Pronosticos/estacional_multiplicativo.json'), true, 512, JSON_THROW_ON_ERROR);

        foreach ($casos as $nombre => $caso) {
            yield $nombre => [$caso];
        }
    }
}
