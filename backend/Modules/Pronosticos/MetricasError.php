<?php

namespace Modules\Pronosticos;

/**
 * Fila período a período y métricas de error (MAD, MSE, MAPE, RSFE, señal de
 * rastreo) con el mismo formato que devuelve PromedioMovilSimple, para que
 * todos los métodos respondan con la misma forma {filas, metricas}.
 */
class MetricasError
{
    public static function fila(string $periodo, ?float $real, ?float $pronostico): array
    {
        $fila = [
            'periodo' => $periodo,
            'real' => $real,
            'pronostico' => $pronostico !== null ? round($pronostico, 4) : null,
            'error' => null,
            'error_abs' => null,
            'error_cuadrado' => null,
            'error_relativo' => null,
        ];

        if ($real === null || $pronostico === null) {
            return $fila;
        }

        $error = $real - $pronostico;

        $fila['error'] = round($error, 4);
        $fila['error_abs'] = round(abs($error), 4);
        $fila['error_cuadrado'] = round($error ** 2, 4);
        $fila['error_relativo'] = $real != 0 ? round(abs($error) / $real, 6) : null;

        return $fila;
    }

    /**
     * N cuenta solo las filas con demanda real y pronóstico a la vez.
     */
    public static function resumen(array $filas): array
    {
        $erroresAbs = [];
        $erroresCuadrado = [];
        $erroresRelativos = [];
        $erroresConSigno = [];

        foreach ($filas as $fila) {
            if ($fila['real'] === null || $fila['pronostico'] === null) {
                continue;
            }

            $error = $fila['real'] - $fila['pronostico'];
            $erroresAbs[] = abs($error);
            $erroresCuadrado[] = $error ** 2;
            $erroresConSigno[] = $error;
            if ($fila['real'] != 0) {
                $erroresRelativos[] = abs($error) / $fila['real'];
            }
        }

        $N = count($erroresAbs);
        $mad = $N > 0 ? array_sum($erroresAbs) / $N : null;
        $mse = $N > 0 ? array_sum($erroresCuadrado) / $N : null;
        $mape = count($erroresRelativos) > 0
            ? (array_sum($erroresRelativos) / count($erroresRelativos)) * 100
            : null;
        $rsfe = array_sum($erroresConSigno);
        $senalRastreo = ($mad !== null && $mad != 0) ? $rsfe / $mad : null;

        return [
            'n_periodos_evaluados' => $N,
            'mad' => $mad !== null ? round($mad, 4) : null,
            'mse' => $mse !== null ? round($mse, 4) : null,
            'mape' => $mape !== null ? round($mape, 4) : null,
            'rsfe' => round($rsfe, 4),
            'senal_rastreo' => $senalRastreo !== null ? round($senalRastreo, 4) : null,
        ];
    }
}
