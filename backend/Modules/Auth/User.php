<?php

namespace Modules\Auth;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * Modelo de usuario del módulo Auth.
 *
 * Vive dentro de Modules/Auth (no en app/Models) porque en un monolito
 * modular cada módulo es dueño de sus propios datos — Auth es hoy el único
 * módulo del proyecto y el dueño natural de la entidad User.
 *
 * Además de ser el modelo de autenticación de Laravel (Authenticatable) y
 * de poder emitir tokens de API (HasApiTokens de Sanctum), este modelo
 * contiene toda la lógica de "2FA por código" (OTP): generar un código,
 * guardarlo de forma segura, y verificarlo.
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Campos que se pueden asignar en masa (ej. User::create($datos)).
     * Cualquier campo que NO esté aquí se ignora si viene de un request —
     * así un atacante no puede colar, por ejemplo, un campo "es_admin=1".
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * Campos que nunca se exponen al convertir el modelo a JSON/array.
     * Todo lo relacionado al código 2FA se oculta aquí para que, aunque
     * alguien olvide usar un Resource, estos datos nunca salgan por error.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
        'two_factor_challenge_token',
        'two_factor_expires_at',
        'two_factor_attempts',
    ];

    /**
     * Conversión automática de tipos al leer estos campos del modelo.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed', // Laravel hashea automáticamente al guardar.
            'two_factor_expires_at' => 'datetime',
        ];
    }

    /**
     * Máximo de intentos equivocados de código 2FA antes de invalidar el
     * desafío por completo (obligando a pedir un código nuevo).
     */
    public const MAX_TWO_FACTOR_ATTEMPTS = 5;

    /**
     * Por defecto, Laravel adivina la Factory de un modelo asumiendo que
     * vive bajo el namespace `App\`. Como este modelo vive bajo
     * `Modules\Auth\`, esa adivinanza falla y hay que decírselo a mano.
     * (Ver también UserFactory::$model — hace falta arreglar los dos lados.)
     */
    protected static function newFactory(): Factory
    {
        return UserFactory::new();
    }

    /**
     * Arranca un desafío de 2FA nuevo para este usuario: genera un código
     * de 6 dígitos y un "token de desafío" (un identificador aleatorio que
     * el frontend usa para decirle al backend "estoy verificando a ESTE
     * usuario" sin tener que volver a mandar el correo/contraseña).
     *
     * Importante: en la base de datos solo se guarda el HASH del código,
     * nunca el código en texto plano — igual que la contraseña. El código
     * en texto plano solo vive en memoria el tiempo justo para mandarlo
     * por correo (o devolverlo en modo desarrollo).
     *
     * @return array{token: string, code: string}
     */
    public function generateTwoFactorChallenge(): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(40);

        $this->forceFill([
            'two_factor_code' => Hash::make($code),
            'two_factor_challenge_token' => $token,
            'two_factor_expires_at' => now()->addMinutes(10),
            'two_factor_attempts' => 0, // Cada código nuevo resetea el contador de intentos.
        ])->save();

        return ['token' => $token, 'code' => $code];
    }

    /**
     * Verifica un código que el usuario escribió contra el desafío activo.
     *
     * Reglas de seguridad aplicadas aquí:
     * - Si no hay desafío activo, ya expiró (10 min), o se agotaron los
     *   intentos, se rechaza sin ni siquiera comparar el código.
     * - Si el código es correcto, se limpia el desafío (no se puede volver
     *   a usar el mismo código dos veces).
     * - Si es incorrecto, se suma un intento fallido; al llegar al máximo
     *   también se limpia el desafío (fuerza a pedir un código nuevo en
     *   vez de dejar la puerta abierta a seguir probando indefinidamente).
     */
    public function verifyTwoFactorCode(string $code): bool
    {
        if (
            $this->two_factor_code === null
            || $this->two_factor_expires_at === null
            || $this->two_factor_expires_at->isPast()
            || $this->two_factor_attempts >= self::MAX_TWO_FACTOR_ATTEMPTS
        ) {
            return false;
        }

        if (Hash::check($code, $this->two_factor_code)) {
            $this->clearTwoFactorChallenge();

            return true;
        }

        $this->increment('two_factor_attempts');

        if ($this->two_factor_attempts >= self::MAX_TWO_FACTOR_ATTEMPTS) {
            $this->clearTwoFactorChallenge();
        }

        return false;
    }

    /**
     * Borra el desafío de 2FA activo (código, token, expiración, intentos).
     *
     * Se llama tanto en éxito como cuando se agotan los intentos, para que
     * nunca quede un código "muerto" dando vueltas en la base de datos que
     * alguien pudiera reutilizar si en el futuro se cambia por error la
     * validación de intentos.
     */
    protected function clearTwoFactorChallenge(): void
    {
        $this->forceFill([
            'two_factor_code' => null,
            'two_factor_challenge_token' => null,
            'two_factor_expires_at' => null,
            'two_factor_attempts' => 0,
        ])->save();
    }
}
