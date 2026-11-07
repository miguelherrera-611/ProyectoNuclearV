<?php

namespace Tests\Unit\Pronosticos;

use Modules\Pronosticos\PromedioMovilPonderado;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Valida el motor contra la hoja "Ejemplo2 (Prom. mov. ponderado)" de
 * Pronosticos de producción ejemplo.xlsx (RF-23, RNF-01).
 */
class PromedioMovilPonderadoTest extends TestCase
{
    /**
     * "Llamadas" semana 1 a 10 del ejemplo del cliente (B4:B13 del Excel).
     */
    private function observacionesDelCliente(): array
    {
        $demandas = [50, 65, 52, 56, 55, 60, 58, 61, 59, 65];

        return array_map(
            fn ($d, $i) => ['periodo' => sprintf('2024-%02d-01', $i + 1), 'cantidad' => $d],
            $demandas,
            array_keys($demandas),
        );
    }

    #[Test]
    public function con_n_2_reproduce_los_numeros_del_cliente(): void
    {
        $resultado = (new PromedioMovilPonderado)->calcular($this->observacionesDelCliente(), ['pesos' => [0.4, 0.6]]);

        $pronosticos = array_column($resultado['filas'], 'pronostico');
        $this->assertSame([null, null, 56.0, 60.0, 54.0, 56.0, 57.0, 59.0, 59.0, 60.0, 61.0], $pronosticos);

        $this->assertEqualsWithDelta(2.625, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(4.5019, $resultado['metricas']['mape'], 0.01);
        $this->assertSame(8, $resultado['metricas']['n_periodos_evaluados']);
    }

    #[Test]
    public function con_n_3_reproduce_los_numeros_del_cliente(): void
    {
        $resultado = (new PromedioMovilPonderado)->calcular($this->observacionesDelCliente(), ['pesos' => [0.6, 0.3, 0.1]]);

        $pronosticos = array_column($resultado['filas'], 'pronostico');
        $this->assertSame([null, null, null, 56.0, 56.0, 55.0, 58.0, 58.0, 60.0, 60.0, 63.0], $pronosticos);

        $this->assertEqualsWithDelta(2.1429, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(3.4938, $resultado['metricas']['mape'], 0.01);
        $this->assertSame(7, $resultado['metricas']['n_periodos_evaluados']);
    }

    #[Test]
    public function rechaza_pesos_que_no_suman_1(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new PromedioMovilPonderado)->calcular($this->observacionesDelCliente(), ['pesos' => [0.5, 0.6]]);
    }

    #[Test]
    public function rechaza_un_solo_peso(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new PromedioMovilPonderado)->calcular($this->observacionesDelCliente(), ['pesos' => [1]]);
    }

    #[Test]
    public function rechaza_n_mayor_o_igual_a_la_cantidad_de_periodos(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new PromedioMovilPonderado)->calcular(array_slice($this->observacionesDelCliente(), 0, 3), ['pesos' => [0.6, 0.3, 0.1]]);
    }
}
