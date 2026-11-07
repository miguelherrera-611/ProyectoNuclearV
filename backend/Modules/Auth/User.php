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

// Vive en Modules/Auth, no en app/Models: en el monolito modular cada
// módulo es dueño de sus propios datos.
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    public const ROLE_ADMINISTRADOR = 'administrador';

    public const ROLE_GERENTE = 'gerente';

    public function esAdministrador(): bool
    {
        return $this->role === self::ROLE_ADMINISTRADOR;
    }

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
        'two_factor_challenge_token',
        'two_factor_expires_at',
        'two_factor_attempts',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_expires_at' => 'datetime',
        ];
    }

    public const MAX_TWO_FACTOR_ATTEMPTS = 5;

    // Laravel adivina la Factory asumiendo namespace `App\`; este modelo
    // vive bajo `Modules\Auth\`, así que hay que indicarla a mano (ver
    // también UserFactory::$model).
    protected static function newFactory(): Factory
    {
        return UserFactory::new();
    }

    /**
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
            'two_factor_attempts' => 0,
        ])->save();

        return ['token' => $token, 'code' => $code];
    }

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

    // Se limpia en éxito y en fallo por igual, para que un código ya
    // usado/agotado nunca quede reutilizable si la validación de intentos
    // llegara a cambiar más adelante.
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
