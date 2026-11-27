<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\PapeleraController;
use Modules\Productos\Producto;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PurgarPapeleraTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function purga_lo_que_lleva_mas_de_30_dias_en_la_papelera(): void
    {
        $viejo = Producto::factory()->create();
        $viejo->delete();
        $viejo->forceFill(['deleted_at' => now()->subDays(PapeleraController::DIAS_PARA_PURGAR + 1)])->save();

        $reciente = Producto::factory()->create();
        $reciente->delete();

        $this->artisan('papelera:purgar')->assertExitCode(0);

        $this->assertDatabaseMissing('productos', ['id' => $viejo->id]);
        $this->assertDatabaseHas('productos', ['id' => $reciente->id]);
        $this->assertDatabaseHas('auditorias', [
            'accion' => 'eliminar_permanente',
            'entidad' => 'Producto',
            'entidad_id' => $viejo->id,
            'user_id' => null,
        ]);
    }

    #[Test]
    public function no_toca_nada_si_todavia_no_pasan_los_30_dias(): void
    {
        $producto = Producto::factory()->create();
        $producto->delete();

        $this->artisan('papelera:purgar');

        $this->assertDatabaseHas('productos', ['id' => $producto->id]);
    }
}
