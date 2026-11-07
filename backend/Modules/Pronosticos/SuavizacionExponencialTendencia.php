<?php

namespace Modules\Pronosticos;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * P4 — Suavización Exponencial con Ajuste de Tendencia (método de Holt):
 *   A(t) = α·D(t) + (1-α)·(A(t-1) + T(t-1))
 *   T(t) = β·(A(t) - A(t-1)) + (1-β)·T(t-1)
 *   Pronóstico de la fila t = redondear(A(t-1) + T(t-1), 0)
 * tal como lo define el ejemplo numérico del cliente
 * (suavizamiento exponencial.xlsx). Nivel y tendencia iniciales se derivan
 * de los dos primeros datos (A1=D1, T1=D2-D1), no son configurables.
 *
 * El pronóstico se redondea a 0 decimales ANTES de calcular el error —así
 * lo hace el Excel (columna de error = ABS(pronóstico_YA_REDONDEADO - real)).
 * Nivel y tendencia en sí nunca se redondean entre periodos: solo el valor
 * mostrado/comparado se redondea, la recursión sigue con toda la precisión.
 */
class SuavizacionExponencialTendencia implements MetodoPronostico
{
    public function calcular(array $observaciones, array $parametros): array
    {
        $alpha = (float) ($parametros['alpha'] ?? 0);
        $beta = (float) ($parametros['beta'] ?? 0);
        $m = count($observaciones);

        if ($alpha <= 0 || $alpha > 1) {
            throw new InvalidArgumentException('alpha debe estar entre 0 (exclusivo) y 1.');
        }

        if ($beta <= 0 || $beta > 1) {
            throw new InvalidArgumentException('beta debe estar entre 0 (exclusivo) y 1.');
        }

        if ($m < 2) {
            throw new InvalidArgumentException('Hacen falta al menos 2 periodos.');
        }

        $demandas = array_column($observaciones, 'cantidad');
        $periodos = array_column($observaciones, 'periodo');

        $nivel = $demandas[0];
        $tendencia = $demandas[1] - $demandas[0];

        $filas = [[
            'periodo' => $periodos[0],
            'real' => $demandas[0],
            'pronostico' => null,
            'error' => null,
            'error_abs' => null,
            'error_cuadrado' => null,
            'error_relativo' => null,
        ]];

        $erroresAbs = [];
        $erroresCuadrado = [];
        $erroresRelativos = [];
        $erroresConSigno = [];

        for ($i = 1; $i < $m; $i++) {
            $nivelAnterior = $nivel;
            $tendenciaAnterior = $tendencia;

            $pronostico = round($nivelAnterior + $tendenciaAnterior, 0);
            $error = $demandas[$i] - $pronostico;
            $errorAbs = abs($error);
            $errorCuadrado = $error ** 2;
            $errorRelativo = $demandas[$i] != 0 ? $errorAbs / $demandas[$i] : null;

            $filas[] = [
                'periodo' => $periodos[$i],
                'real' => $demandas[$i],
                'pronostico' => $pronostico,
                'error' => $error,
                'error_abs' => $errorAbs,
                'error_cuadrado' => $errorCuadrado,
                'error_relativo' => $errorRelativo !== null ? round($errorRelativo, 6) : null,
            ];

            $erroresAbs[] = $errorAbs;
            $erroresCuadrado[] = $errorCuadrado;
            $erroresConSigno[] = $error;
            if ($errorRelativo !== null) {
                $erroresRelativos[] = $errorRelativo;
            }

            // Nivel y tendencia nuevos, con toda la precisión (sin redondear).
            $nivel = $alpha * $demandas[$i] + (1 - $alpha) * ($nivelAnterior + $tendenciaAnterior);
            $tendencia = $beta * ($nivel - $nivelAnterior) + (1 - $beta) * $tendenciaAnterior;
        }

        $pronosticoSiguiente = round($nivel + $tendencia, 0);
        $periodoSiguiente = Carbon::parse($periodos[$m - 1])->addMonthNoOverflow()->toDateString();

        $filas[] = [
            'periodo' => $periodoSiguiente,
            'real' => null,
            'pronostico' => $pronosticoSiguiente,
            'error' => null,
            'error_abs' => null,
            'error_cuadrado' => null,
            'error_relativo' => null,
        ];

        $N = count($erroresAbs);
        $mad = $N > 0 ? array_sum($erroresAbs) / $N : null;
        $mse = $N > 0 ? array_sum($erroresCuadrado) / $N : null;
        $mape = count($erroresRelativos) > 0
            ? (array_sum($erroresRelativos) / count($erroresRelativos)) * 100
            : null;
        $rsfe = array_sum($erroresConSigno);
        $senalRastreo = ($mad !== null && $mad != 0) ? $rsfe / $mad : null;

        return [
            'filas' => $filas,
            'metricas' => [
                'n_periodos_evaluados' => $N,
                'mad' => $mad !== null ? round($mad, 4) : null,
                'mse' => $mse !== null ? round($mse, 4) : null,
                'mape' => $mape !== null ? round($mape, 4) : null,
                'rsfe' => round($rsfe, 4),
                'senal_rastreo' => $senalRastreo !== null ? round($senalRastreo, 4) : null,
            ],
        ];
    }
}
