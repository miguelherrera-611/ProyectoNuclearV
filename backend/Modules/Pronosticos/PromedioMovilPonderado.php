<?php

namespace Modules\Pronosticos;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * P2 — Promedio Móvil Ponderado: F(t) = ROUND(w1·D(t-1) + ... + wn·D(t-n), 0),
 * tal como lo define el ejemplo del cliente (hoja "Ejemplo2" de
 * Pronosticos de producción ejemplo.xlsx). w1 (K0 en el Excel) es el peso de
 * la demanda más reciente; n sale de la cantidad de pesos.
 *
 * El redondeo a unidades enteras es el del Excel, para coincidir con el
 * benchmark del cliente.
 */
class PromedioMovilPonderado implements MetodoPronostico
{
    public function calcular(array $observaciones, array $parametros): array
    {
        $pesos = array_map('floatval', array_values($parametros['pesos'] ?? []));
        $n = count($pesos);
        $m = count($observaciones);

        if ($n < 2) {
            throw new InvalidArgumentException('Se necesitan al menos 2 pesos.');
        }

        foreach ($pesos as $peso) {
            if ($peso < 0) {
                throw new InvalidArgumentException('Los pesos no pueden ser negativos.');
            }
        }

        if (abs(array_sum($pesos) - 1) > 0.0001) {
            throw new InvalidArgumentException('Los pesos deben sumar 1 (suman '.round(array_sum($pesos), 4).').');
        }

        if ($n >= $m) {
            throw new InvalidArgumentException("n debe ser menor que la cantidad de periodos ({$m}).");
        }

        $demandas = array_column($observaciones, 'cantidad');
        $periodos = array_column($observaciones, 'periodo');

        $pronosticar = function (int $t) use ($demandas, $pesos, $n): float {
            $suma = 0;
            for ($k = 0; $k < $n; $k++) {
                $suma += $pesos[$k] * $demandas[$t - 1 - $k];
            }

            return round($suma, 0);
        };

        $filas = [];
        for ($i = 0; $i < $m; $i++) {
            $pronostico = $i >= $n ? $pronosticar($i) : null;
            $filas[] = MetricasError::fila($periodos[$i], (float) $demandas[$i], $pronostico);
        }

        // No tiene demanda real todavía, así que no entra en las métricas.
        $periodoSiguiente = Carbon::parse($periodos[$m - 1])->addMonthNoOverflow()->toDateString();
        $filas[] = MetricasError::fila($periodoSiguiente, null, $pronosticar($m));

        return [
            'filas' => $filas,
            'metricas' => MetricasError::resumen($filas),
        ];
    }
}
