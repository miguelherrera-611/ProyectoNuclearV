<?php

namespace Modules\Pronosticos;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * P1 — Promedio Móvil Simple, tal como lo define el documento de requisitos
 * y el ejemplo numérico del cliente (movil simple.xlsx):
 *
 *   F(t) = promedio(D(t-1), ..., D(t-n))   — para t desde el periodo n+1.
 *
 * Antes de eso no hay pronóstico. El periodo siguiente al último dato real
 * (el "hacia adelante") también se calcula, pero no entra en las métricas
 * de error porque no hay demanda real todavía con qué compararlo.
 *
 * Clase pura: no toca la base de datos, solo recibe arreglos y devuelve
 * arreglos — así se puede probar exacto contra los números que firmó el
 * cliente, sin necesidad de levantar nada.
 */
class PromedioMovilSimple implements MetodoPronostico
{
    public function calcular(array $observaciones, array $parametros): array
    {
        $n = (int) ($parametros['n'] ?? 0);
        $m = count($observaciones);

        if ($n < 2) {
            throw new InvalidArgumentException('n debe ser al menos 2.');
        }

        if ($n >= $m) {
            throw new InvalidArgumentException("n debe ser menor que la cantidad de periodos ({$m}).");
        }

        $demandas = array_column($observaciones, 'cantidad');
        $periodos = array_column($observaciones, 'periodo');

        $filas = [];
        $erroresAbs = [];
        $erroresCuadrado = [];
        $erroresRelativos = [];
        $erroresConSigno = [];

        for ($i = 0; $i < $m; $i++) {
            $fila = [
                'periodo' => $periodos[$i],
                'real' => $demandas[$i],
                'pronostico' => null,
                'error' => null,
                'error_abs' => null,
                'error_cuadrado' => null,
                'error_relativo' => null,
            ];

            // Recién hay pronóstico cuando ya pasaron al menos n periodos
            // anteriores (ej. con n=2, el primer pronóstico es el periodo 3).
            if ($i >= $n) {
                $ventana = array_slice($demandas, $i - $n, $n);
                $pronostico = array_sum($ventana) / $n;
                $error = $demandas[$i] - $pronostico;
                $errorAbs = abs($error);
                $errorCuadrado = $error ** 2;
                $errorRelativo = $demandas[$i] != 0 ? $errorAbs / $demandas[$i] : null;

                $fila['pronostico'] = round($pronostico, 4);
                $fila['error'] = round($error, 4);
                $fila['error_abs'] = round($errorAbs, 4);
                $fila['error_cuadrado'] = round($errorCuadrado, 4);
                $fila['error_relativo'] = $errorRelativo !== null ? round($errorRelativo, 6) : null;

                $erroresAbs[] = $errorAbs;
                $erroresCuadrado[] = $errorCuadrado;
                $erroresConSigno[] = $error;
                if ($errorRelativo !== null) {
                    $erroresRelativos[] = $errorRelativo;
                }
            }

            $filas[] = $fila;
        }

        // Pronóstico "hacia adelante": el periodo siguiente al último dato
        // real, usando los últimos n valores conocidos. No tiene demanda
        // real todavía, así que no entra en MAD/MSE/MAPE/RSFE.
        $ventanaFinal = array_slice($demandas, $m - $n, $n);
        $pronosticoSiguiente = array_sum($ventanaFinal) / $n;
        $periodoSiguiente = Carbon::parse($periodos[$m - 1])->addMonthNoOverflow()->toDateString();

        $filas[] = [
            'periodo' => $periodoSiguiente,
            'real' => null,
            'pronostico' => round($pronosticoSiguiente, 4),
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
