<?php

namespace Tests\Unit\Pronosticos;

use Modules\Pronosticos\PromedioMovilSimple;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Valida el motor de cálculo contra el ejemplo numérico exacto que trae el
 * cliente en movil simple.xlsx (RF-22) — RNF-01 pide que los resultados
 * coincidan con su benchmark dentro de 0,01 de tolerancia, así que se
 * comprueba de verdad, no a ojo.
 */
class PromedioMovilSimpleTest extends TestCase
{
    /**
     * "Llamadas" semana 1 a 10 del ejemplo del cliente (fila B2:B11 del Excel).
     */
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
    public function con_n_2_reproduce_los_numeros_firmados_por_el_cliente(): void
    {
        $resultado = (new PromedioMovilSimple)->calcular($this->observacionesDelCliente(), ['n' => 2]);

        // Primer pronóstico (periodo 3): F3 = 57,5
        $this->assertEqualsWithDelta(57.5, $resultado['filas'][2]['pronostico'], 0.01);

        // Pronóstico hacia adelante (periodo 11, el que sigue al último dato real): 62
        $this->assertEqualsWithDelta(62, end($resultado['filas'])['pronostico'], 0.01);

        $this->assertEqualsWithDelta(2.69, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(4.63, $resultado['metricas']['mape'], 0.01);

        // Los primeros 2 periodos no tienen pronóstico todavía.
        $this->assertNull($resultado['filas'][0]['pronostico']);
        $this->assertNull($resultado['filas'][1]['pronostico']);
    }

    #[Test]
    public function con_n_3_reproduce_los_numeros_firmados_por_el_cliente(): void
    {
        $resultado = (new PromedioMovilSimple)->calcular($this->observacionesDelCliente(), ['n' => 3]);

        // El documento de requisitos redondeó mal este valor en el texto
        // ("F12 = 61") — la fórmula real del Excel (AVERAGE(B9:B11), que es
        // la fuente de verdad firmada por el cliente) da 61,67. Se usa el
        // valor de la fórmula, no el del resumen de texto.
        $this->assertEqualsWithDelta(61.6667, end($resultado['filas'])['pronostico'], 0.01);

        $this->assertEqualsWithDelta(2.76, $resultado['metricas']['mad'], 0.01);
        $this->assertEqualsWithDelta(4.56, $resultado['metricas']['mape'], 0.01);

        // Con n=3 los primeros 3 periodos no tienen pronóstico.
        $this->assertNull($resultado['filas'][0]['pronostico']);
        $this->assertNull($resultado['filas'][1]['pronostico']);
        $this->assertNull($resultado['filas'][2]['pronostico']);
    }

    #[Test]
    public function rechaza_n_menor_que_2(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new PromedioMovilSimple)->calcular($this->observacionesDelCliente(), ['n' => 1]);
    }

    #[Test]
    public function rechaza_n_mayor_o_igual_a_la_cantidad_de_periodos(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new PromedioMovilSimple)->calcular(array_slice($this->observacionesDelCliente(), 0, 3), ['n' => 3]);
    }
}
