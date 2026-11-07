<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;

/**
 * Histórico mensual real de los 2 productos del cliente, ene-2024 a oct-2026
 * (hoja Movimientos_Ordenados de Mico_Acelerador_Tornillo_En_Hierro_Ordenado.xlsx
 * y Mico_Clutch_Bronce_Tornillo_En_Hierro_Ordenado.xlsx). Totales: 281.380 y
 * 163.331 unidades (RF-09).
 *
 * Oct-2026 está incompleto (última factura 09/10/2026) pero se carga tal cual
 * viene en el Excel.
 */
class ObservacionesSeeder extends Seeder
{
    private const PRIMER_PERIODO = '2024-01-01';

    private const HISTORICOS = [
        'MICO-ACEL-001' => [
            'nombre' => 'Mico Acelerador Tornillo en Hierro',
            'unidades' => [
                7000, 11800, 3710, 12100, 10600, 8200, 10200, 12000, 13250, 7400, 16900, 7000,
                4000, 13500, 9000, 10400, 6600, 8500, 14200, 7800, 5900, 6700, 6000, 10100,
                4000, 8600, 4900, 3320, 6700, 3900, 5500, 12300, 6200, 3100,
            ],
        ],
        'MICO-CLUTCH-001' => [
            'nombre' => 'Mico Clutch Bronce Tornillo en Hierro',
            'unidades' => [
                5850, 4350, 3410, 6200, 5300, 3500, 3600, 6850, 5200, 3000, 9100, 3100,
                5500, 6800, 5900, 1500, 9700, 1500, 6000, 3500, 7521, 1800, 4000, 5400,
                4900, 5500, 5000, 5750, 3600, 4200, 5100, 4300, 4400, 2000,
            ],
        ],
    ];

    public function run(): void
    {
        foreach (self::HISTORICOS as $codigo => $historico) {
            $producto = Producto::query()->firstOrCreate(
                ['codigo' => $codigo],
                ['nombre' => $historico['nombre'], 'activo' => true],
            );

            foreach ($historico['unidades'] as $i => $cantidad) {
                $periodo = Carbon::parse(self::PRIMER_PERIODO)->addMonthsNoOverflow($i)->toDateString();

                // whereDate() y no updateOrCreate(): ver ObservacionController::store.
                $observacion = Observacion::where('producto_id', $producto->id)
                    ->whereDate('periodo', $periodo)
                    ->first();

                if ($observacion) {
                    $observacion->update(['cantidad' => $cantidad]);
                } else {
                    Observacion::create([
                        'producto_id' => $producto->id,
                        'periodo' => $periodo,
                        'cantidad' => $cantidad,
                    ]);
                }
            }
        }
    }
}
