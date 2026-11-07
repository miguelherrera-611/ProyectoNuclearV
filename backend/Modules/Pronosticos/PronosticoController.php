<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;

class PronosticoController
{
    public function calcular(Request $request, PromedioMovilSimple $metodo)
    {
        $data = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            'n' => ['required', 'integer', 'min:2'],
        ]);

        $observaciones = Observacion::where('producto_id', $data['producto_id'])
            ->orderBy('periodo')
            ->get(['periodo', 'cantidad'])
            ->map(fn ($o) => ['periodo' => $o->periodo->toDateString(), 'cantidad' => (float) $o->cantidad])
            ->all();

        if (count($observaciones) < 2) {
            return response()->json([
                'message' => 'Hacen falta al menos 2 periodos capturados para calcular un pronóstico.',
            ], 422);
        }

        if ($data['n'] >= count($observaciones)) {
            return response()->json([
                'message' => 'n debe ser menor que la cantidad de periodos capturados ('.count($observaciones).').',
            ], 422);
        }

        $resultado = $metodo->calcular($observaciones, ['n' => $data['n']]);

        return response()->json(['data' => $resultado]);
    }
}
