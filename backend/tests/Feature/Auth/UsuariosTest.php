<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UsuariosTest extends TestCase
{
    use RefreshDatabase;

    private function tokenDe(string $rol): string
    {
        return User::factory()->create(['role' => $rol])->createToken('test')->plainTextToken;
    }

    #[Test]
    public function administrador_puede_listar_usuarios(): void
    {
        User::factory()->count(2)->create();
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->getJson('/api/usuarios');

        $response->assertOk();
        // Los 2 de arriba + el propio administrador que hizo la llamada.
        $this->assertCount(3, $response->json('data'));
        $this->assertArrayNotHasKey('password', $response->json('data.0'));
    }

    #[Test]
    public function gerente_no_puede_listar_usuarios(): void
    {
        $token = $this->tokenDe(User::ROLE_GERENTE);

        $this->withToken($token)->getJson('/api/usuarios')->assertForbidden();
    }

    #[Test]
    public function administrador_puede_crear_un_usuario(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'JR Mecanizados Industriales',
            'email' => 'jrmecanizadosindustriales@gmail.com',
            'password' => 'password123',
            'role' => User::ROLE_ADMINISTRADOR,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'jrmecanizadosindustriales@gmail.com')
            ->assertJsonPath('data.role', User::ROLE_ADMINISTRADOR)
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', ['email' => 'jrmecanizadosindustriales@gmail.com']);

        $nuevo = User::where('email', 'jrmecanizadosindustriales@gmail.com')->first();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password123', $nuevo->password));
    }

    #[Test]
    public function gerente_no_puede_crear_un_usuario(): void
    {
        $token = $this->tokenDe(User::ROLE_GERENTE);

        $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Alguien',
            'email' => 'alguien@example.com',
            'password' => 'password123',
            'role' => User::ROLE_GERENTE,
        ])->assertForbidden();
    }

    #[Test]
    public function rechaza_un_correo_duplicado(): void
    {
        $existente = User::factory()->create();
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Otro',
            'email' => $existente->email,
            'password' => 'password123',
            'role' => User::ROLE_GERENTE,
        ])->assertStatus(422);
    }

    #[Test]
    public function rechaza_una_contrasena_corta(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Otro',
            'email' => 'otro@example.com',
            'password' => '123',
            'role' => User::ROLE_GERENTE,
        ])->assertStatus(422);
    }

    #[Test]
    public function rechaza_un_rol_desconocido(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Otro',
            'email' => 'otro@example.com',
            'password' => 'password123',
            'role' => 'superadmin',
        ])->assertStatus(422);
    }

    #[Test]
    public function requiere_autenticacion(): void
    {
        $this->getJson('/api/usuarios')->assertUnauthorized();
    }
}
