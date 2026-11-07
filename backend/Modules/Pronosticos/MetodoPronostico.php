<?php

namespace Modules\Pronosticos;

// Contrato para cualquier método de pronóstico (P1–P6 del documento de
// requisitos) — así agregar un método nuevo no toca los que ya existen
// (RNF-21, patrón Strategy), sin montar una capa de más.
interface MetodoPronostico
{
    /**
     * @param  array<int, array{periodo: string, cantidad: float}>  $observaciones  Ordenadas por periodo ascendente.
     * @param  array<string, mixed>  $parametros  Propios de cada método (ej. "n" para el promedio móvil).
     * @return array{filas: array, metricas: array}
     */
    public function calcular(array $observaciones, array $parametros): array;
}
