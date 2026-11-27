<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuditoriaTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function crear_un_producto_queda_auditado_y_visible_para_el_administrador(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/productos', ['codigo' => 'X-001', 'nombre' => 'Producto de prueba'])
            ->assertCreated();

        $response = $this->withToken($token)->getJson('/api/auditoria');

        $response->assertOk();
        $registro = collect($response->json('data'))->firstWhere('entidad', 'Producto');
        $this->assertNotNull($registro);
        $this->assertSame('crear', $registro['accion']);
        $this->assertSame($admin->id, $registro['user_id']);
        $this->assertSame($admin->name, $registro['usuario']['name']);
    }

    #[Test]
    public function gerente_no_puede_ver_la_auditoria(): void
    {
        $token = User::factory()->create(['role' => User::ROLE_GERENTE])->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auditoria')->assertForbidden();
    }
}
