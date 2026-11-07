<?php

namespace Modules\Pronosticos;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * P3 — Suavizamiento Exponencial Simple: F(1) = pronóstico inicial (D1 por
 * defecto) y F(t) = ROUND(α·D(t-1) + (1-α)·F(t-1), 0), tal como lo define el
 * ejemplo del cliente (hoja "Ejemplo3" de Pronosticos de producción
 * ejemplo.xlsx).
 *
 * Igual que en el Excel: cada F(t) se redondea a unidades y ese valor
 * redondeado es el que alimenta el periodo siguiente, y el periodo 1 entra en
 * MAD/MAPE.
 */
class SuavizamientoExponencial implements MetodoPronostico
{
    public function calcular(array $observaciones, array $parametros): array
    {
        $alpha = (float) ($parametros['alpha'] ?? 0);
        $m = count($observaciones);

        if ($alpha <= 0 || $alpha > 1) {
            throw new InvalidArgumentException('α debe estar entre 0 (sin incluir) y 1.');
        }

        if ($m < 2) {
            throw new InvalidArgumentException('Hacen falta al menos 2 periodos.');
        }

        $demandas = array_column($observaciones, 'cantidad');
        $periodos = array_column($observaciones, 'periodo');

        $pronostico = isset($parametros['pronostico_inicial'])
            ? (float) $parametros['pronostico_inicial']
            : (float) $demandas[0];

        $filas = [];
        for ($i = 0; $i < $m; $i++) {
            if ($i > 0) {
                $pronostico = round($alpha * $demandas[$i - 1] + (1 - $alpha) * $pronostico, 0);
            }
            $filas[] = MetricasError::fila($periodos[$i], (float) $demandas[$i], $pronostico);
        }

        // No tiene demanda real todavía, así que no entra en las métricas.
        $pronosticoSiguiente = round($alpha * $demandas[$m - 1] + (1 - $alpha) * $pronostico, 0);
        $periodoSiguiente = Carbon::parse($periodos[$m - 1])->addMonthNoOverflow()->toDateString();
        $filas[] = MetricasError::fila($periodoSiguiente, null, $pronosticoSiguiente);

        return [
            'filas' => $filas,
            'metricas' => MetricasError::resumen($filas),
        ];
    }
}
