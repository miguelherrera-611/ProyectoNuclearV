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

    #[Test]
    public function filtra_por_entidad(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/productos', ['codigo' => 'X-001', 'nombre' => 'Producto'])->assertCreated();
        $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Otro', 'email' => 'otro@example.com', 'password' => 'password123', 'role' => User::ROLE_GERENTE,
        ])->assertCreated();

        $response = $this->withToken($token)->getJson('/api/auditoria?entidad=Usuario');

        $response->assertOk();
        $entidades = array_unique(array_column($response->json('data'), 'entidad'));
        $this->assertSame(['Usuario'], array_values($entidades));
    }

    #[Test]
    public function filtra_por_accion(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $token = $admin->createToken('test')->plainTextToken;
        $producto = \Modules\Productos\Producto::factory()->create();

        $this->withToken($token)->deleteJson("/api/productos/{$producto->id}")->assertNoContent();

        $response = $this->withToken($token)->getJson('/api/auditoria?accion=eliminar');

        $response->assertOk();
        $acciones = array_unique(array_column($response->json('data'), 'accion'));
        $this->assertSame(['eliminar'], array_values($acciones));
    }

    #[Test]
    public function busca_por_texto_en_la_descripcion(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/productos', ['codigo' => 'ZAPATO-01', 'nombre' => 'Zapato de cuero'])->assertCreated();
        $this->withToken($token)->postJson('/api/productos', ['codigo' => 'MESA-01', 'nombre' => 'Mesa de madera'])->assertCreated();

        $response = $this->withToken($token)->getJson('/api/auditoria?buscar=ZAPATO-01');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertStringContainsString('ZAPATO-01', $response->json('data.0.descripcion'));
    }
}
