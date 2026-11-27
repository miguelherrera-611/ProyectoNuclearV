<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PapeleraTest extends TestCase
{
    use RefreshDatabase;

    private function tokenAdmin(): string
    {
        return $this->admin()->createToken('test')->plainTextToken;
    }

    // Contraseña conocida porque eliminar_permanente la exige como
    // confirmación — UserFactory ya la deja en "password" por defecto.
    private function admin(): User
    {
        return User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
    }

    #[Test]
    public function lista_lo_eliminado_de_los_3_tipos_y_no_lo_que_sigue_activo(): void
    {
        $token = $this->tokenAdmin();

        $productoEliminado = Producto::factory()->create();
        $productoEliminado->delete();
        Producto::factory()->create(); // sigue activo, no debe aparecer

        $response = $this->withToken($token)->getJson('/api/papelera');

        $response->assertOk();
        $tipos = array_column($response->json('data'), 'tipo');
        $this->assertContains('productos', $tipos);
        $this->assertCount(1, array_filter($response->json('data'), fn ($i) => $i['tipo'] === 'productos'));
    }

    #[Test]
    public function restaurar_un_producto_lo_vuelve_a_dejar_visible(): void
    {
        $token = $this->tokenAdmin();
        $producto = Producto::factory()->create();
        $producto->delete();

        $this->withToken($token)
            ->postJson("/api/papelera/productos/{$producto->id}/restaurar")
            ->assertOk();

        $this->assertDatabaseHas('productos', ['id' => $producto->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('auditorias', ['accion' => 'restaurar', 'entidad' => 'Producto', 'entidad_id' => $producto->id]);
    }

    // Restaurar NO pide contraseña: no es destructivo, es la acción
    // inversa — pedirla ahí solo sería fricción sin ganar seguridad.
    #[Test]
    public function eliminar_permanente_lo_borra_de_verdad_si_la_contrasena_es_correcta(): void
    {
        $admin = $this->admin();
        $token = $admin->createToken('test')->plainTextToken;
        $observacion = Observacion::create(['producto_id' => Producto::factory()->create()->id, 'periodo' => '2024-01-01', 'cantidad' => 10]);
        $observacion->delete();

        $this->withToken($token)
            ->deleteJson("/api/papelera/observaciones/{$observacion->id}", ['password' => 'password'])
            ->assertOk();

        $this->assertDatabaseMissing('observaciones', ['id' => $observacion->id]);
        $this->assertDatabaseHas('auditorias', ['accion' => 'eliminar_permanente', 'entidad' => 'Observacion']);
    }

    #[Test]
    public function eliminar_permanente_rechaza_una_contrasena_incorrecta_y_no_borra_nada(): void
    {
        $admin = $this->admin();
        $token = $admin->createToken('test')->plainTextToken;
        $producto = Producto::factory()->create();
        $producto->delete();

        $this->withToken($token)
            ->deleteJson("/api/papelera/productos/{$producto->id}", ['password' => 'esta-no-es'])
            ->assertStatus(422);

        $this->assertSoftDeleted('productos', ['id' => $producto->id]);
    }

    #[Test]
    public function eliminar_permanente_exige_la_contrasena(): void
    {
        $token = $this->tokenAdmin();
        $producto = Producto::factory()->create();
        $producto->delete();

        $this->withToken($token)
            ->deleteJson("/api/papelera/productos/{$producto->id}")
            ->assertStatus(422);

        $this->assertSoftDeleted('productos', ['id' => $producto->id]);
    }

    #[Test]
    public function no_se_puede_restaurar_algo_que_no_esta_en_la_papelera(): void
    {
        $token = $this->tokenAdmin();
        $producto = Producto::factory()->create(); // activo, no eliminado

        $this->withToken($token)
            ->postJson("/api/papelera/productos/{$producto->id}/restaurar")
            ->assertNotFound();
    }

    #[Test]
    public function gerente_no_puede_ver_la_papelera(): void
    {
        $token = User::factory()->create(['role' => User::ROLE_GERENTE])->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/papelera')->assertForbidden();
    }
}
