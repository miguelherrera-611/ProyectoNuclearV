<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deja pasar solo al rol "administrador". Se usa en las rutas de escritura
 * de los módulos operativos (Productos, Pronósticos) — el Gerente puede
 * consultar, pero cualquier acción que cree/edite/borre algo exige este
 * middleware. La restricción vive acá, en el backend, no solo escondiendo
 * el botón en el frontend (RF-04 / RNF-11).
 */
class EnsureIsAdministrador
{
    public function handle(Request $request, \Closure $next): Response
    {
        if (! $request->user()?->esAdministrador()) {
            return response()->json([
                'message' => 'No tienes permiso para esta acción.',
            ], 403);
        }

        return $next($request);
    }
}
