<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Modules\Auth\User;
use Tests\TestCase;

class RecuperarPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_pide_un_codigo_si_el_correo_existe(): void
    {
        $user = User::factory()->create(['email' => 'existe@example.com']);

        $response = $this->postJson('/api/auth/olvide-password', ['email' => 'existe@example.com']);

        $response->assertOk()->assertJsonStructure(['data' => ['challenge_token', 'dev_code']]);
        $this->assertNotNull($user->refresh()->two_factor_challenge_token);
        $this->assertSame('password_reset', $user->two_factor_purpose);
    }

    // Misma respuesta exista o no el correo — nunca se revela qué cuentas
    // están registradas (mismo criterio que el login).
    public function test_responde_igual_aunque_el_correo_no_exista(): void
    {
        $response = $this->postJson('/api/auth/olvide-password', ['email' => 'no-existe@example.com']);

        $response->assertOk()->assertJsonStructure(['data' => ['challenge_token']]);
        $this->assertArrayNotHasKey('dev_code', $response->json('data'));
    }

    public function test_restablece_el_password_con_el_codigo_correcto(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('sesion-vieja')->plainTextToken;

        $solicitud = $this->postJson('/api/auth/olvide-password', ['email' => $user->email]);

        $this->postJson('/api/auth/restablecer-password', [
            'challenge_token' => $solicitud->json('data.challenge_token'),
            'code' => $solicitud->json('data.dev_code'),
            'password_nueva' => 'password-nueva-123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('password-nueva-123', $user->refresh()->password));

        // Cualquier sesión que hubiera quedado abierta se cierra.
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_no_restablece_con_un_codigo_incorrecto(): void
    {
        $user = User::factory()->create(['password' => 'password-vieja']);

        $solicitud = $this->postJson('/api/auth/olvide-password', ['email' => $user->email]);
        $codigoCorrecto = $solicitud->json('data.dev_code');
        $codigoIncorrecto = $codigoCorrecto === '000000' ? '111111' : '000000';

        $this->postJson('/api/auth/restablecer-password', [
            'challenge_token' => $solicitud->json('data.challenge_token'),
            'code' => $codigoIncorrecto,
            'password_nueva' => 'password-nueva-123',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('password-vieja', $user->refresh()->password));
    }

    // Mismas columnas que el challenge de login — un código de login no
    // debe servir para restablecer la contraseña.
    public function test_un_challenge_de_login_no_sirve_para_restablecer_password(): void
    {
        $user = User::factory()->create(['password' => 'password-vieja']);
        $challengeDeLogin = $user->generateTwoFactorChallenge('login');

        $this->postJson('/api/auth/restablecer-password', [
            'challenge_token' => $challengeDeLogin['token'],
            'code' => $challengeDeLogin['code'],
            'password_nueva' => 'password-nueva-123',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('password-vieja', $user->refresh()->password));
    }
}
