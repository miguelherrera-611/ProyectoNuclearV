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

    #[Test]
    public function devuelve_el_catalogo_de_permisos_y_sus_defaults_por_rol(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->getJson('/api/usuarios/catalogo-permisos');

        $response->assertOk();
        $this->assertArrayHasKey('productos.crear', $response->json('data.permisos'));
        $this->assertArrayHasKey(User::ROLE_GERENTE, $response->json('data.default_por_rol'));
        $this->assertNotContains('productos.crear', $response->json('data.default_por_rol.'.User::ROLE_GERENTE));
    }

    #[Test]
    public function crear_sin_mandar_permisos_usa_los_del_rol_por_defecto(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Gerente Nuevo',
            'email' => 'gerente.nuevo@example.com',
            'password' => 'password123',
            'role' => User::ROLE_GERENTE,
        ]);

        $response->assertCreated();
        $this->assertSame(['pronostico.calcular'], $response->json('data.permisos'));
    }

    #[Test]
    public function el_administrador_puede_personalizar_los_permisos_al_crear(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Gerente Con Extra',
            'email' => 'gerente.extra@example.com',
            'password' => 'password123',
            'role' => User::ROLE_GERENTE,
            'permisos' => ['pronostico.calcular', 'observaciones.capturar'],
        ]);

        $response->assertCreated();
        $this->assertEqualsCanonicalizing(
            ['pronostico.calcular', 'observaciones.capturar'],
            $response->json('data.permisos'),
        );
    }

    #[Test]
    public function ignora_claves_de_permisos_que_no_existen_en_el_catalogo(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);

        $response = $this->withToken($token)->postJson('/api/usuarios', [
            'name' => 'Alguien',
            'email' => 'alguien.raro@example.com',
            'password' => 'password123',
            'role' => User::ROLE_GERENTE,
            'permisos' => ['pronostico.calcular', 'superpoder.volar'],
        ]);

        $response->assertCreated();
        $this->assertSame(['pronostico.calcular'], $response->json('data.permisos'));
    }

    #[Test]
    public function el_administrador_puede_editar_nombre_correo_rol_y_permisos(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $usuario = User::factory()->create(['role' => User::ROLE_GERENTE]);

        $response = $this->withToken($token)->putJson("/api/usuarios/{$usuario->id}", [
            'name' => 'Nombre Editado',
            'email' => 'editado@example.com',
            'role' => User::ROLE_ADMINISTRADOR,
            'permisos' => ['productos.crear'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Nombre Editado')
            ->assertJsonPath('data.email', 'editado@example.com')
            ->assertJsonPath('data.role', User::ROLE_ADMINISTRADOR)
            ->assertJsonPath('data.permisos', ['productos.crear']);

        // La contraseña no se mandó: debe seguir siendo la original.
        $usuario->refresh();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password', $usuario->password));
    }

    #[Test]
    public function el_administrador_puede_cambiar_la_contrasena_al_editar(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $usuario = User::factory()->create(['role' => User::ROLE_GERENTE]);

        $this->withToken($token)->putJson("/api/usuarios/{$usuario->id}", [
            'name' => $usuario->name,
            'email' => $usuario->email,
            'role' => $usuario->role,
            'password' => 'nuevaClave123',
        ])->assertOk();

        $usuario->refresh();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('nuevaClave123', $usuario->password));
    }

    #[Test]
    public function editar_los_permisos_de_un_usuario_no_afecta_a_otro(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $gerenteA = User::factory()->create(['role' => User::ROLE_GERENTE]);
        $gerenteB = User::factory()->create(['role' => User::ROLE_GERENTE]);

        $this->withToken($token)->putJson("/api/usuarios/{$gerenteA->id}", [
            'name' => $gerenteA->name,
            'email' => $gerenteA->email,
            'role' => User::ROLE_GERENTE,
            'permisos' => ['pronostico.calcular', 'observaciones.capturar'],
        ])->assertOk();

        $gerenteB->refresh();
        $this->assertSame(['pronostico.calcular'], $gerenteB->permisos);
    }

    #[Test]
    public function gerente_no_puede_editar_un_usuario(): void
    {
        $token = $this->tokenDe(User::ROLE_GERENTE);
        $usuario = User::factory()->create();

        $this->withToken($token)->putJson("/api/usuarios/{$usuario->id}", [
            'name' => 'Lo que sea',
            'email' => $usuario->email,
            'role' => User::ROLE_GERENTE,
        ])->assertForbidden();
    }
}
