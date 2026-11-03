<?php

namespace Tests\Feature\Productos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Auth\User;
use Modules\Productos\Producto;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProductoAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(); // por si algo llegara a tocar Brevo, nunca de verdad en pruebas.
    }

    #[Test]
    public function gerente_puede_listar_pero_no_crear_un_producto(): void
    {
        $gerente = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $token = $gerente->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/productos')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/productos', ['codigo' => 'X-001', 'nombre' => 'Producto de prueba'])
            ->assertStatus(403);

        $this->assertDatabaseCount('productos', 0);
    }

    #[Test]
    public function administrador_puede_crear_un_producto(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMINISTRADOR]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/productos', ['codigo' => 'X-001', 'nombre' => 'Producto de prueba'])
            ->assertStatus(201);

        $this->assertDatabaseHas('productos', ['codigo' => 'X-001']);
    }

    #[Test]
    public function gerente_no_puede_dar_de_baja_un_producto(): void
    {
        $gerente = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $producto = Producto::factory()->create();
        $token = $gerente->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/productos/{$producto->id}")
            ->assertStatus(403);
    }
}
