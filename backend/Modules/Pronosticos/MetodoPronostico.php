<?php

namespace Modules\Pronosticos;

/**
 * Contrato que debe cumplir cualquier método de pronóstico (P1–P6 del
 * documento de requisitos). Hoy solo existe PromedioMovilSimple (P1), pero
 * esta interfaz ya deja listo que agregar un método nuevo más adelante no
 * toque los que ya existen (RNF-21: patrón Strategy) — sin montar una capa
 * de más, es nada más esta interfaz chica.
 */
interface MetodoPronostico
{
    /**
     * @param  array<int, array{periodo: string, cantidad: float}>  $observaciones  Ordenadas por periodo ascendente.
     * @param  array<string, mixed>  $parametros  Propios de cada método (ej. "n" para el promedio móvil).
     * @return array{filas: array, metricas: array}
     */
    public function calcular(array $observaciones, array $parametros): array;
}
