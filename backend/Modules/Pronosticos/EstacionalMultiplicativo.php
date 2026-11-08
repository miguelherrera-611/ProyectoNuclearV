<?php

namespace Modules\Pronosticos;

use DateTimeImmutable;
use InvalidArgumentException;

final class EstacionalMultiplicativo implements MetodoPronostico
{
    private const MESES_POR_ANIO = 12;

    public function calcular(array $observaciones, array $parametros): array
    {
        $demandasPorAnio = $this->agruparPorAnio($observaciones, $parametros['periodo_corte'] ?? null);
        $ultimoAnio = array_key_last($demandasPorAnio);
        $ultimoMesReal = count($demandasPorAnio[$ultimoAnio]);
        $ultimoPeriodoReal = sprintf('%04d-%02d-01', $ultimoAnio, $ultimoMesReal);
        $demandasPorAnio = $this->completarUltimoAnio($demandasPorAnio);
        $totales = array_map('array_sum', $demandasPorAnio);
        $promedios = array_map(fn ($total) => $total / self::MESES_POR_ANIO, $totales);

        foreach ($promedios as $promedio) {
            if ($promedio <= 0) {
                throw new InvalidArgumentException('Cada año debe tener una demanda total mayor que cero.');
            }
        }

        $indices = $this->calcularIndicesEstacionales($demandasPorAnio, $promedios);
        $incrementos = [];
        $totalAnterior = null;

        foreach ($totales as $total) {
            if ($totalAnterior !== null) {
                $incrementos[] = $total - $totalAnterior;
            }
            $totalAnterior = $total;
        }

        $incrementoPromedio = array_sum($incrementos) / count($incrementos);
        $totalProyectado = $totales[$ultimoAnio] + $incrementoPromedio;
        $promedioProyectado = $totalProyectado / self::MESES_POR_ANIO;
        $filas = [];
        $filasEvaluadas = [];

        foreach ($demandasPorAnio as $anio => $demandas) {
            foreach ($demandas as $mes => $demanda) {
                $periodo = sprintf('%04d-%02d-01', $anio, $mes);
                $pronostico = round($promedios[$anio] * $indices[$mes], 0);
                $fila = MetricasError::fila($periodo, $demanda, $pronostico);

                // El Excel incluye los meses estimados en MAD y MAPE, aunque no sean ventas registradas.
                $filasEvaluadas[] = $fila;
                if ($periodo > $ultimoPeriodoReal) {
                    $fila['demanda_estimada'] = $demanda;
                    $fila['real'] = null;
                }
                $filas[] = $fila;
            }
        }

        foreach ($indices as $mes => $indice) {
            $filas[] = MetricasError::fila(
                sprintf('%04d-%02d-01', $ultimoAnio + 1, $mes),
                null,
                round($promedioProyectado * $indice, 0),
            );
        }

        return [
            'filas' => $filas,
            'metricas' => MetricasError::resumen($filasEvaluadas),
            'estacional' => [
                'anio_proyectado' => $ultimoAnio + 1,
                'total_proyectado' => $totalProyectado,
                'incremento_promedio' => $incrementoPromedio,
                'indices' => array_values($indices),
                'ultimo_periodo_real' => $ultimoPeriodoReal,
            ],
        ];
    }

    private function agruparPorAnio(array $observaciones, ?string $periodoCorte): array
    {
        if ($periodoCorte !== null && ! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $periodoCorte)) {
            throw new InvalidArgumentException('El periodo de corte debe tener el formato AAAA-MM.');
        }

        $demandasPorAnio = [];
        $periodoEsperado = null;

        foreach ($observaciones as $observacion) {
            $periodo = DateTimeImmutable::createFromFormat('!Y-m-d', $observacion['periodo']);

            if ($periodo === false || $periodo->format('Y-m-01') !== $observacion['periodo']) {
                throw new InvalidArgumentException('Los periodos deben ser fechas mensuales con formato AAAA-MM-01.');
            }

            if ($periodoCorte !== null && $periodo->format('Y-m') > $periodoCorte) {
                continue;
            }

            $periodoEsperado ??= $periodo->setDate((int) $periodo->format('Y'), 1, 1);

            if ($periodo != $periodoEsperado) {
                throw new InvalidArgumentException('El histórico debe comenzar en enero y contener meses consecutivos, sin duplicados.');
            }

            $cantidad = $observacion['cantidad'];
            if (! is_numeric($cantidad) || ! is_finite((float) $cantidad) || $cantidad < 0) {
                throw new InvalidArgumentException('Las cantidades deben ser números finitos mayores o iguales a cero.');
            }

            $demandasPorAnio[(int) $periodo->format('Y')][(int) $periodo->format('n')] = (float) $cantidad;
            $periodoEsperado = $periodo->modify('+1 month');
        }

        if (count($demandasPorAnio) < 2) {
            throw new InvalidArgumentException('Hacen falta un año completo y al menos un mes del año siguiente para calcular el estacional multiplicativo.');
        }

        return $demandasPorAnio;
    }

    private function completarUltimoAnio(array $demandasPorAnio): array
    {
        $ultimoAnio = array_key_last($demandasPorAnio);
        $mesesObservados = count($demandasPorAnio[$ultimoAnio]);

        if ($mesesObservados === self::MESES_POR_ANIO) {
            return $demandasPorAnio;
        }

        $anioAnterior = $demandasPorAnio[$ultimoAnio - 1];
        $acumuladoAnterior = array_sum(array_slice($anioAnterior, 0, $mesesObservados));

        if ($acumuladoAnterior <= 0) {
            throw new InvalidArgumentException('El acumulado de los mismos meses del año anterior debe ser mayor que cero para estimar el cierre anual.');
        }

        $crecimiento = array_sum($demandasPorAnio[$ultimoAnio]) / $acumuladoAnterior;

        for ($mes = $mesesObservados + 1; $mes <= self::MESES_POR_ANIO; $mes++) {
            // Redondear el cierre anticipadamente alteraría los índices y las métricas del Excel.
            $demandasPorAnio[$ultimoAnio][$mes] = $anioAnterior[$mes] * $crecimiento;
        }

        return $demandasPorAnio;
    }

    private function calcularIndicesEstacionales(array $demandasPorAnio, array $promedios): array
    {
        $indices = array_fill(1, self::MESES_POR_ANIO, 0.0);
        $cantidadAnios = count($demandasPorAnio);

        foreach ($demandasPorAnio as $anio => $demandas) {
            foreach ($demandas as $mes => $demanda) {
                $indices[$mes] += $demanda / $promedios[$anio];
            }
        }

        return array_map(fn ($suma) => $suma / $cantidadAnios, $indices);
    }
}
