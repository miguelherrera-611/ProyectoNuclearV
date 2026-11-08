<?php

namespace Modules\Pronosticos;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * P5 — Regresión lineal: Pt = ROUND(a + b·t, 0), donde b es la pendiente y
 * a el intercepto de la recta ajustada a la demanda histórica.
 *
 * El periodo ordinal se usa como variable independiente porque es la misma
 * referencia temporal continua que utiliza el Excel del cliente.
 */
class RegresionLineal implements MetodoPronostico
{
    public function calcular(array $observaciones, array $parametros): array
    {
        $m = count($observaciones);

        if ($m < 2) {
            throw new InvalidArgumentException('Hacen falta al menos 2 periodos.');
        }

        $demandas = array_map('floatval', array_column($observaciones, 'cantidad'));
        $periodos = array_column($observaciones, 'periodo');
        $periodosOrdinales = range(1, $m);
        $promedioPeriodo = array_sum($periodosOrdinales) / $m;
        $promedioDemanda = array_sum($demandas) / $m;
        $sumaCuadradosPeriodo = 0.0;
        $sumaProductos = 0.0;

        foreach ($periodosOrdinales as $indice => $periodoOrdinal) {
            $diferenciaPeriodo = $periodoOrdinal - $promedioPeriodo;
            $sumaCuadradosPeriodo += $diferenciaPeriodo ** 2;
            $sumaProductos += $diferenciaPeriodo * ($demandas[$indice] - $promedioDemanda);
        }

        if ($sumaCuadradosPeriodo == 0.0) {
            throw new InvalidArgumentException('No se puede calcular una regresión lineal sin variación temporal.');
        }

        $pendiente = $sumaProductos / $sumaCuadradosPeriodo;
        $intercepto = $promedioDemanda - ($pendiente * $promedioPeriodo);
        $filas = [];

        foreach ($periodosOrdinales as $indice => $periodoOrdinal) {
            $pronostico = round(($pendiente * $periodoOrdinal) + $intercepto, 0);
            $filas[] = MetricasError::fila($periodos[$indice], $demandas[$indice], $pronostico);
        }

        $periodoSiguiente = Carbon::parse($periodos[$m - 1])->addMonthNoOverflow()->toDateString();
        $filas[] = MetricasError::fila(
            $periodoSiguiente,
            null,
            round(($pendiente * ($m + 1)) + $intercepto, 0),
        );

        return [
            'filas' => $filas,
            'metricas' => MetricasError::resumen($filas),
        ];
    }
}
