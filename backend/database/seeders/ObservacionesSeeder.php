<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;

/**
 * Histórico mensual real de los 3 productos del cliente, ene-2024 a sep-2026
 * (hoja "Datos" de Pronosticos Jr Mecanizados.xlsx). Totales: 278.280,
 * 614.700 y 161.331 unidades (RF-09).
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
                4000, 8600, 4900, 3320, 6700, 3900, 5500, 12300, 6200,
            ],
        ],
        'MICO-CLUTCH-HIERRO-001' => [
            'nombre' => 'Mico Clutch Hierro Tornillo en Hierro',
            'unidades' => [
                26700, 12900, 15420, 35400, 24130, 34300, 11300, 22300, 27800, 30200, 24000, 28500,
                13800, 7200, 25000, 18200, 8100, 18800, 23100, 12400, 24700, 14200, 11600, 19500,
                34100, 19000, 3500, 16350, 3000, 20900, 8500, 10000, 9800,
            ],
        ],
        'MICO-CLUTCH-001' => [
            'nombre' => 'Mico Clutch Bronce Tornillo en Hierro',
            'unidades' => [
                5850, 4350, 3410, 6200, 5300, 3500, 3600, 6850, 5200, 3000, 9100, 3100,
                5500, 6800, 5900, 1500, 9700, 1500, 6000, 3500, 7521, 1800, 4000, 5400,
                4900, 5500, 5000, 5750, 3600, 4200, 5100, 4300, 4400,
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
