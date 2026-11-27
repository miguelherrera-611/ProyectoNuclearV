<?php

namespace Modules\Auth;

use Illuminate\Http\Request;

class AuditoriaController
{
    // Filtros del lado del servidor (a diferencia de Productos/Usuarios/
    // Observaciones/Papelera, que filtran en el navegador): esto puede
    // crecer sin límite, así que ya viene paginado — filtrar después de
    // traer la página no serviría de nada.
    public function index(Request $request)
    {
        $registros = Auditoria::with('usuario:id,name,email')
            ->when($request->filled('entidad'), fn ($q) => $q->where('entidad', $request->string('entidad')))
            ->when($request->filled('accion'), fn ($q) => $q->where('accion', $request->string('accion')))
            ->when(
                $request->filled('buscar'),
                fn ($q) => $q->where('descripcion', 'like', '%'.$request->string('buscar').'%'),
            )
            ->orderByDesc('created_at')
            ->paginate(50)
            ->withQueryString();

        return response()->json($registros);
    }
}
