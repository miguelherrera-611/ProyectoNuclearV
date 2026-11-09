<?php

namespace Tests\Feature\Pronosticos;

use Database\Seeders\ObservacionesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ObservacionesSeederTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function carga_los_33_meses_con_los_totales_de_los_excel_del_cliente(): void
    {
        $this->seed(ObservacionesSeeder::class);

        $esperados = [
            'MICO-ACEL-001' => 278280,
            'MICO-CLUTCH-HIERRO-001' => 614700,
            'MICO-CLUTCH-001' => 161331,
        ];

        foreach ($esperados as $codigo => $total) {
            $observaciones = Observacion::where('producto_id', Producto::where('codigo', $codigo)->value('id'))
                ->orderBy('periodo')
                ->get();

            $this->assertCount(33, $observaciones);
            $this->assertSame($total, (int) $observaciones->sum('cantidad'));
            $this->assertSame('2024-01-01', $observaciones->first()->periodo->toDateString());
            $this->assertSame('2026-09-01', $observaciones->last()->periodo->toDateString());
        }
    }

    #[Test]
    public function correrlo_dos_veces_no_duplica_datos(): void
    {
        $this->seed(ObservacionesSeeder::class);
        $this->seed(ObservacionesSeeder::class);

        $this->assertSame(99, Observacion::count());
    }
}
