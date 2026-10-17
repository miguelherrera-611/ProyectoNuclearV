<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Define exactamente qué campos del usuario salen por la API — nunca se
 * devuelve el modelo User "crudo" directamente. Así, aunque el modelo gane
 * campos nuevos en el futuro (ej. two_factor_code), hace falta agregarlos
 * acá a propósito para que se vean; por accidente no se filtra nada.
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at,
        ];
    }
}
