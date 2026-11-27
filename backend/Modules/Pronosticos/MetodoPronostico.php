<?php

namespace Modules\Pronosticos;


interface MetodoPronostico
{
    /**
     * @param  array<int, array{periodo: string, cantidad: float}>  $observaciones  Ordenadas por periodo ascendente.
     * @param  array<string, mixed>  $parametros  Propios de cada método (ej. "n" para el promedio móvil).
     * @return array{filas: array, metricas: array}
     */
    public function calcular(array $observaciones, array $parametros): array;
}
