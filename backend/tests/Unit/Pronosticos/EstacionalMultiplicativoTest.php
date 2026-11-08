<?php

namespace Tests\Unit\Pronosticos;

use DateTimeImmutable;
use InvalidArgumentException;
use Modules\Pronosticos\EstacionalMultiplicativo;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class EstacionalMultiplicativoTest extends TestCase
{
    #[Test]
    #[DataProvider('casosDelExcel')]
    public function reproduce_las_celdas_de_estacional_multiplicativo_del_excel_jr(array $caso): void
    {
        $resultado = (new EstacionalMultiplicativo)->calcular(self::observaciones($caso['demandas']), []);

        $this->assertCount(48, $resultado['filas']);
        $this->assertSame(
            array_map('floatval', [...$caso['ajustes_historicos'], ...$caso['proyecciones']]),
            array_column($resultado['filas'], 'pronostico'),
        );

        foreach (array_slice($resultado['filas'], 0, 36) as $indice => $fila) {
            $this->assertEqualsWithDelta($caso['errores_absolutos'][$indice], $fila['error_abs'], 0.00005);
            $this->assertEqualsWithDelta($caso['errores_relativos'][$indice], $fila['error_relativo'], 0.0000005);
        }

        foreach ($caso['cierre_estimado'] as $indice => $cantidad) {
            $fila = $resultado['filas'][33 + $indice];
            $this->assertNull($fila['real']);
            $this->assertEqualsWithDelta($cantidad, $fila['demanda_estimada'], 0.00000001);
        }

        foreach (array_slice($resultado['filas'], 36) as $fila) {
            $this->assertNull($fila['real']);
            $this->assertNull($fila['error']);
            $this->assertArrayNotHasKey('demanda_estimada', $fila);
        }

        $this->assertSame(36, $resultado['metricas']['n_periodos_evaluados']);
        $this->assertEqualsWithDelta($caso['mad'], $resultado['metricas']['mad'], 0.00005);
        $this->assertEqualsWithDelta($caso['mape'], $resultado['metricas']['mape'], 0.00005);
        $this->assertSame(2027, $resultado['estacional']['anio_proyectado']);
        $this->assertSame('2026-09-01', $resultado['estacional']['ultimo_periodo_real']);
        $this->assertEqualsWithDelta($caso['total_proyectado'], $resultado['estacional']['total_proyectado'], 0.00000001);
        $this->assertEqualsWithDelta($caso['incremento_promedio'], $resultado['estacional']['incremento_promedio'], 0.00000001);

        foreach ($caso['indices'] as $indice => $valor) {
            $this->assertEqualsWithDelta($valor, $resultado['estacional']['indices'][$indice], 0.000000000001);
        }

        $this->assertEqualsWithDelta(12.0, array_sum($resultado['estacional']['indices']), 0.000000000001);
        $this->assertSame('2027-01-01', $resultado['filas'][36]['periodo']);
        $this->assertSame('2027-12-01', $resultado['filas'][47]['periodo']);
    }

    #[Test]
    public function el_corte_excluye_octubre_incompleto_sin_modificar_las_observaciones(): void
    {
        $caso = iterator_to_array(self::casosDelExcel())['acelerador'][0];
        $observaciones = self::observaciones([...$caso['demandas'], 3100]);
        $original = $observaciones;

        $resultado = (new EstacionalMultiplicativo)->calcular($observaciones, ['periodo_corte' => '2026-09']);

        $this->assertSame($original, $observaciones);
        $this->assertSame(array_map('floatval', $caso['proyecciones']), array_column(array_slice($resultado['filas'], 36), 'pronostico'));
        $this->assertEqualsWithDelta($caso['mad'], $resultado['metricas']['mad'], 0.00005);
    }

    #[Test]
    public function usa_todos_los_datos_cuando_no_hay_corte(): void
    {
        $observaciones = self::observaciones([...array_fill(0, 12, 10), ...array_fill(0, 10, 20)]);
        $resultado = (new EstacionalMultiplicativo)->calcular($observaciones, []);

        $this->assertSame('2025-10-01', $resultado['estacional']['ultimo_periodo_real']);
        $this->assertSame(20.0, $resultado['filas'][21]['real']);
        $this->assertSame(20.0, $resultado['filas'][22]['demanda_estimada']);
        $this->assertSame(30.0, $resultado['filas'][24]['pronostico']);
    }

    #[Test]
    public function proyecta_doce_meses_con_dos_anios_completos_sin_estimaciones(): void
    {
        $resultado = (new EstacionalMultiplicativo)->calcular(
            self::observaciones([...array_fill(0, 12, 10), ...array_fill(0, 12, 20)]),
            [],
        );

        $this->assertCount(36, $resultado['filas']);
        $this->assertSame(360.0, $resultado['estacional']['total_proyectado']);
        $this->assertSame(array_fill(0, 12, 30.0), array_column(array_slice($resultado['filas'], 24), 'pronostico'));
        $this->assertSame(0.0, $resultado['metricas']['mad']);
        $this->assertSame(0.0, $resultado['metricas']['mape']);
        $this->assertNull($resultado['metricas']['senal_rastreo']);
        $this->assertSame([], array_column($resultado['filas'], 'demanda_estimada'));
    }

    #[Test]
    public function admite_meses_sin_ventas_sin_dividir_el_error_por_cero(): void
    {
        $anio = [0, ...array_fill(0, 11, 10)];
        $resultado = (new EstacionalMultiplicativo)->calcular(self::observaciones([...$anio, ...$anio]), []);

        $this->assertSame(0.0, $resultado['filas'][0]['pronostico']);
        $this->assertNull($resultado['filas'][0]['error_relativo']);
        $this->assertSame(0.0, $resultado['metricas']['mape']);
        $this->assertSame(24, $resultado['metricas']['n_periodos_evaluados']);
    }

    #[Test]
    #[DataProvider('historicosInvalidos')]
    public function rechaza_historicos_que_no_permiten_calcular_indices(array $observaciones): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new EstacionalMultiplicativo)->calcular($observaciones, []);
    }

    #[Test]
    public function rechaza_un_corte_con_formato_invalido(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new EstacionalMultiplicativo)->calcular(self::observaciones(array_fill(0, 24, 10)), ['periodo_corte' => '2026-13']);
    }

    public static function casosDelExcel(): iterable
    {
        $casos = json_decode(file_get_contents(__DIR__.'/../../Fixtures/Pronosticos/estacional_multiplicativo.json'), true, 512, JSON_THROW_ON_ERROR);

        foreach ($casos as $nombre => $caso) {
            yield $nombre => [$caso];
        }
    }

    public static function historicosInvalidos(): iterable
    {
        $completo = self::observaciones(array_fill(0, 24, 10));

        yield 'vacio' => [[]];
        yield 'un solo año' => [array_slice($completo, 0, 12)];
        yield 'inicio distinto de enero' => [array_slice($completo, 1)];
        yield 'mes intermedio ausente' => [[...array_slice($completo, 0, 5), ...array_slice($completo, 6)]];
        yield 'mes duplicado' => [[$completo[0], ...$completo]];
        yield 'año sin ventas' => [self::observaciones([...array_fill(0, 12, 0), ...array_fill(0, 12, 10)])];
        yield 'acumulado anterior en cero' => [self::observaciones([0, ...array_fill(0, 11, 10), 20])];
        yield 'cantidad negativa' => [self::observaciones([-1, ...array_fill(0, 23, 10)])];
        yield 'cantidad no finita' => [self::observaciones([INF, ...array_fill(0, 23, 10)])];

        $fechaInvalida = $completo;
        $fechaInvalida[1]['periodo'] = '2024-02-31';
        yield 'fecha imposible' => [$fechaInvalida];
    }

    private static function observaciones(array $demandas): array
    {
        $inicio = new DateTimeImmutable('2024-01-01');

        return array_map(
            fn ($cantidad, $indice) => [
                'periodo' => $inicio->modify("+{$indice} months")->format('Y-m-d'),
                'cantidad' => $cantidad,
            ],
            $demandas,
            array_keys($demandas),
        );
    }
}
