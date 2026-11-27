<?php

namespace Modules\Auth;

class AuditoriaController
{
    public function index()
    {
        $registros = Auditoria::with('usuario:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($registros);
    }
}
