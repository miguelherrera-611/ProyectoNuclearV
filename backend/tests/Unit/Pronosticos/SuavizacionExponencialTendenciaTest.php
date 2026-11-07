<?php

namespace Tests\Unit\Pronosticos;

use Modules\Pronosticos\SuavizacionExponencialTendencia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Valida el motor de cálculo contra el ejemplo numérico exacto que trae el
 * cliente en suavizamiento exponencial.xlsx — mismos datos de "Llamadas"
 * que se usaron para el promedio móvil simple.
 */
class SuavizacionExponencialTendenciaTest extends TestCase
{
    private function observacionesDelCliente(): array
    {
        $demandas = [50, 65, 52, 56, 55, 60, 58, 61, 59, 65];
        $meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

        return array_map(
            fn ($d, $m) => ['periodo' => "2024-{$m}-01", 'cantidad' => $d],
            $demandas,
            $meses,
        );
    }

    #[Test]
    public function con_alpha_095_y_beta_05_reproduce_los_numeros_firmados_por_el_cliente(): void
    {
        $resultado = (new SuavizacionExponencialTendencia)->calcular(
            $this->observacionesDelCliente(),
            ['alpha' => 0.95, 'beta' => 0.5],
        );

        // Primera fila (semana 1): sin pronóstico, es la que inicializa nivel y tendencia.
        $this->assertNull($resultado['filas'][0]['pronostico']);

        // Semana 2: pronóstico = A1+T1 = 50+15 = 65, error 0.
        $this->assertEquals(65, $resultado['filas'][1]['pronostico']);
        $this->assertEquals(0, $resultado['filas'][1]['error_abs']);

        // Semana 4: el Excel da pronóstico 55 (redondeado) y error 1 — si no
        // se redondea ANTES de calcular el error, da 0.9 en vez de 1.
        $this->assertEquals(55, $resultado['filas'][3]['pronostico']);
        $this->assertEquals(1, $resultado['filas'][3]['error_abs']);

        // Pronóstico hacia adelante (periodo 11, el que sigue al último dato real): 67.
        $this->assertEquals(67, end($resultado['filas'])['pronostico']);

        $this->assertEqualsWithDelta(5.6667, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(10.25, $resultado['metricas']['mape'], 0.01);
    }

    #[Test]
    public function rechaza_alpha_fuera_de_rango(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new SuavizacionExponencialTendencia)->calcular($this->observacionesDelCliente(), ['alpha' => 0, 'beta' => 0.5]);
    }

    #[Test]
    public function rechaza_beta_fuera_de_rango(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new SuavizacionExponencialTendencia)->calcular($this->observacionesDelCliente(), ['alpha' => 0.95, 'beta' => 1.5]);
    }
}
