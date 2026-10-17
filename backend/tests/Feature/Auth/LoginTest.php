<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Modules\Auth\User;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Nunca llamar a Brevo de verdad en pruebas — ni gastar créditos
        // reales ni depender de que haya conexión a internet en CI.
        Http::fake();
    }

    public function test_login_with_valid_credentials_sends_two_factor_challenge(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secreto123')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'secreto123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.two_factor_required', true)
            ->assertJsonStructure(['data' => ['challenge_token', 'dev_code']]);

        // El código en texto plano nunca se guarda — solo su hash. Se
        // comprueba que el hash guardado corresponde al código que
        // devolvió la API (no que simplemente sean strings distintos).
        $user->refresh();
        $this->assertNotNull($user->two_factor_code);
        $this->assertTrue(Hash::check($response->json('data.dev_code'), $user->two_factor_code));

        $this->assertDatabaseHas('login_audits', [
            'event' => 'otp_sent',
            'email' => $user->email,
        ]);

        Http::assertSent(fn ($request) => $request->url() === 'https://api.brevo.com/v3/smtp/email');
    }

    public function test_login_with_wrong_password_returns_generic_error(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secreto123')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'contraseña-incorrecta',
        ]);

        $response->assertStatus(422)->assertJson(['message' => 'Credenciales inválidas.']);

        $this->assertDatabaseHas('login_audits', [
            'event' => 'login_failed',
            'email' => $user->email,
        ]);
    }

    public function test_login_with_nonexistent_email_returns_the_same_generic_error(): void
    {
        // Clave de seguridad: un correo que no existe debe dar EXACTAMENTE
        // el mismo error (mismo mensaje, mismo código HTTP) que una
        // contraseña incorrecta — si no, se puede usar el login para
        // adivinar qué correos están registrados (enumeración de usuarios).
        $response = $this->postJson('/api/auth/login', [
            'email' => 'no-existe@example.com',
            'password' => 'lo-que-sea',
        ]);

        $response->assertStatus(422)->assertJson(['message' => 'Credenciales inválidas.']);
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        $email = 'ataque-fuerza-bruta@example.com';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'x'])
                ->assertStatus(422);
        }

        // El 6to intento en menos de un minuto debe quedar bloqueado.
        $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'x'])
            ->assertStatus(429);
    }
}
