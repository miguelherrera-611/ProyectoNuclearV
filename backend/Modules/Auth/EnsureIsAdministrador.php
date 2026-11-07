<?php

namespace Modules\Auth;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// La restricción vive en el backend, no solo escondiendo el botón en el
// frontend (RF-04 / RNF-11).
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
