<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Auth\User;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_code_issues_an_access_token(): void
    {
        $user = User::factory()->create();
        $challenge = $user->generateTwoFactorChallenge();

        $response = $this->postJson('/api/auth/verify-two-factor', [
            'challenge_token' => $challenge['token'],
            'code' => $challenge['code'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email']]]);

        // El token que entrega de verdad autoriza contra una ruta protegida.
        $token = $response->json('data.token');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);

        $this->assertDatabaseHas('login_audits', [
            'event' => 'otp_verified',
            'email' => $user->email,
        ]);
    }

    public function test_invalid_code_is_rejected_and_does_not_issue_a_token(): void
    {
        $user = User::factory()->create();
        $challenge = $user->generateTwoFactorChallenge();

        $response = $this->postJson('/api/auth/verify-two-factor', [
            'challenge_token' => $challenge['token'],
            'code' => '000000' === $challenge['code'] ? '111111' : '000000',
        ]);

        $response->assertStatus(422)->assertJson(['message' => 'Código inválido o expirado.']);
        $this->assertArrayNotHasKey('token', $response->json('data') ?? []);

        $user->refresh();
        $this->assertSame(1, $user->two_factor_attempts);
    }

    public function test_code_expires_after_ten_minutes(): void
    {
        $user = User::factory()->create();
        $challenge = $user->generateTwoFactorChallenge();

        $this->travel(11)->minutes();

        $this->postJson('/api/auth/verify-two-factor', [
            'challenge_token' => $challenge['token'],
            'code' => $challenge['code'],
        ])->assertStatus(422);
    }

    public function test_challenge_is_invalidated_after_five_failed_attempts(): void
    {
        $user = User::factory()->create();
        $challenge = $user->generateTwoFactorChallenge();
        $wrongCode = $challenge['code'] === '000000' ? '111111' : '000000';

        // Exactamente 5 intentos fallidos (el límite de intentos Y el rate
        // limit de la ruta son ambos 5/min — en 5 todavía no choca con el
        // rate limit, recién en un 6to intento lo haría).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/verify-two-factor', [
                'challenge_token' => $challenge['token'],
                'code' => $wrongCode,
            ])->assertStatus(422);
        }

        // El desafío queda invalidado en la base de datos — ni el código
        // correcto original sirve ya, porque el challenge_token mismo se
        // limpió. (No se prueba con una 6ta petición HTTP porque esa ya
        // chocaría con el rate limit de la ruta, que también es 5/min —
        // probar esto directo contra la base evita mezclar las dos reglas.)
        $user->refresh();
        $this->assertNull($user->two_factor_code);
        $this->assertNull($user->two_factor_challenge_token);
        $this->assertSame(0, $user->two_factor_attempts);
    }

    public function test_unrecognized_challenge_token_returns_generic_error(): void
    {
        $this->postJson('/api/auth/verify-two-factor', [
            'challenge_token' => 'esto-no-existe',
            'code' => '123456',
        ])->assertStatus(422)->assertJson(['message' => 'Código inválido o expirado.']);
    }
}
