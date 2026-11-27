<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Auth\User;
use Tests\TestCase;

class PerfilTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_actualiza_su_propio_nombre(): void
    {
        $user = User::factory()->create(['name' => 'Nombre Viejo']);

        $this->withToken($this->token($user))
            ->putJson('/api/perfil', ['name' => 'Nombre Nuevo'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nombre Nuevo');

        $this->assertSame('Nombre Nuevo', $user->refresh()->name);
    }

    public function test_sube_su_foto_de_perfil(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->withToken($this->token($user))
            ->post('/api/perfil/avatar', ['avatar' => UploadedFile::fake()->image('foto.jpg')]);

        $response->assertOk();
        $this->assertNotNull($user->refresh()->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
    }

    public function test_rechaza_un_archivo_que_no_es_imagen_como_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->post('/api/perfil/avatar', ['avatar' => UploadedFile::fake()->create('documento.pdf', 10)])
            ->assertStatus(422);
    }

    public function test_cambia_su_password_con_la_actual_correcta(): void
    {
        $user = User::factory()->create(['password' => 'password-vieja']);

        $this->withToken($this->token($user))
            ->putJson('/api/perfil/password', [
                'password_actual' => 'password-vieja',
                'password_nueva' => 'password-nueva-123',
            ])
            ->assertNoContent();

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password-nueva-123', $user->refresh()->password));
    }

    public function test_no_cambia_el_password_si_la_actual_esta_mal(): void
    {
        $user = User::factory()->create(['password' => 'password-vieja']);

        $this->withToken($this->token($user))
            ->putJson('/api/perfil/password', [
                'password_actual' => 'password-incorrecta',
                'password_nueva' => 'password-nueva-123',
            ])
            ->assertStatus(422);

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password-vieja', $user->refresh()->password));
    }

    public function test_solicita_y_confirma_un_cambio_de_correo(): void
    {
        $user = User::factory()->create(['email' => 'actual@example.com']);

        $solicitud = $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/solicitar', ['nuevo_correo' => 'nuevo@example.com']);

        $solicitud->assertOk()->assertJsonStructure(['data' => ['challenge_token', 'dev_code']]);

        // El correo sigue siendo el de antes hasta que se confirme el código.
        $this->assertSame('actual@example.com', $user->refresh()->email);

        $confirmacion = $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/confirmar', [
                'challenge_token' => $solicitud->json('data.challenge_token'),
                'code' => $solicitud->json('data.dev_code'),
            ]);

        $confirmacion->assertOk()->assertJsonPath('data.email', 'nuevo@example.com');
        $this->assertSame('nuevo@example.com', $user->refresh()->email);
    }

    public function test_no_confirma_el_cambio_de_correo_con_un_codigo_incorrecto(): void
    {
        $user = User::factory()->create(['email' => 'actual@example.com']);

        $solicitud = $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/solicitar', ['nuevo_correo' => 'nuevo@example.com']);

        $codigoCorrecto = $solicitud->json('data.dev_code');
        $codigoIncorrecto = $codigoCorrecto === '000000' ? '111111' : '000000';

        $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/confirmar', [
                'challenge_token' => $solicitud->json('data.challenge_token'),
                'code' => $codigoIncorrecto,
            ])
            ->assertStatus(422);

        $this->assertSame('actual@example.com', $user->refresh()->email);
    }

    public function test_no_puede_cambiar_a_un_correo_ya_usado_por_otro(): void
    {
        User::factory()->create(['email' => 'ocupado@example.com']);
        $user = User::factory()->create(['email' => 'actual@example.com']);

        $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/solicitar', ['nuevo_correo' => 'ocupado@example.com'])
            ->assertStatus(422);
    }

    // El challenge de login y el de cambio de correo comparten las mismas
    // columnas (User::generateTwoFactorChallenge) — un código de uno no
    // debe servir para confirmar el otro.
    public function test_un_challenge_de_login_no_sirve_para_confirmar_un_cambio_de_correo(): void
    {
        $user = User::factory()->create();
        $challengeDeLogin = $user->generateTwoFactorChallenge('login');

        $this->withToken($this->token($user))
            ->postJson('/api/perfil/cambiar-correo/confirmar', [
                'challenge_token' => $challengeDeLogin['token'],
                'code' => $challengeDeLogin['code'],
            ])
            ->assertStatus(422);
    }
}
