<?php

namespace Tests\Unit\Pronosticos;

use Modules\Pronosticos\SuavizamientoExponencial;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Valida el motor contra la hoja "Ejemplo3 (Suavizamiento Expone)" de
 * Pronosticos de producción ejemplo.xlsx (RF-24, RNF-01).
 */
class SuavizamientoExponencialTest extends TestCase
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
    public function con_alpha_045_reproduce_los_numeros_del_cliente(): void
    {
        $resultado = (new SuavizamientoExponencial)->calcular($this->observacionesDelCliente(), ['alpha' => 0.45]);

        $pronosticos = array_column($resultado['filas'], 'pronostico');
        // Los 10 primeros son los del Excel (C4:C13); el 11 lo deja vacío el
        // Excel y aquí se proyecta: ROUND(0,45·65 + 0,55·59) = 62.
        $this->assertSame([50.0, 50.0, 57.0, 55.0, 55.0, 55.0, 57.0, 57.0, 59.0, 59.0, 62.0], $pronosticos);

        // Igual que AVERAGE(D4:D13) del Excel: el periodo 1 (error 0) cuenta.
        $this->assertEqualsWithDelta(3.7, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(6.0324, $resultado['metricas']['mape'], 0.01);
        $this->assertSame(10, $resultado['metricas']['n_periodos_evaluados']);
    }

    #[Test]
    public function usa_el_pronostico_inicial_si_se_envia(): void
    {
        $resultado = (new SuavizamientoExponencial)->calcular(
            $this->observacionesDelCliente(),
            ['alpha' => 0.45, 'pronostico_inicial' => 60],
        );

        $this->assertSame(60.0, $resultado['filas'][0]['pronostico']);
        // ROUND(0,45·50 + 0,55·60) = ROUND(55,5) = 56
        $this->assertSame(56.0, $resultado['filas'][1]['pronostico']);
    }

    #[Test]
    public function rechaza_alpha_cero(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new SuavizamientoExponencial)->calcular($this->observacionesDelCliente(), ['alpha' => 0]);
    }

    #[Test]
    public function rechaza_alpha_mayor_que_1(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new SuavizamientoExponencial)->calcular($this->observacionesDelCliente(), ['alpha' => 1.2]);
    }
}
