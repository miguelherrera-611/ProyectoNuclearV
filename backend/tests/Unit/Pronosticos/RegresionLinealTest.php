<?php

namespace Tests\Unit\Pronosticos;

use Modules\Pronosticos\RegresionLineal;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RegresionLinealTest extends TestCase
{
    private function observacionesDelCliente(): array
    {
        $demandas = [50, 65, 52, 56, 55, 60, 58, 61, 59, 65];
        $meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

        return array_map(
            fn ($demanda, $mes) => ['periodo' => "2024-{$mes}-01", 'cantidad' => $demanda],
            $demandas,
            $meses,
        );
    }

    #[Test]
    public function reproduce_la_regresion_lineal_del_excel(): void
    {
        $resultado = (new RegresionLineal)->calcular($this->observacionesDelCliente(), []);

        $this->assertSame(
            [54.0, 55.0, 56.0, 57.0, 58.0, 59.0, 59.0, 60.0, 61.0, 62.0, 63.0],
            array_column($resultado['filas'], 'pronostico'),
        );
        $this->assertEqualsWithDelta(3.0, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(5.1353, $resultado['metricas']['mape'], 0.01);
    }

    #[Test]
    public function rechaza_un_historico_insuficiente(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new RegresionLineal)->calcular([
            ['periodo' => '2024-01-01', 'cantidad' => 50],
        ], []);
    }
}
