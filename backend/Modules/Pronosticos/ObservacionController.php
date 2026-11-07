<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ObservacionController
{
    public function index(Request $request)
    {
        $request->validate(['producto_id' => ['required', 'integer', 'exists:productos,id']]);

        $observaciones = Observacion::where('producto_id', $request->integer('producto_id'))
            ->orderBy('periodo')
            ->get(['id', 'periodo', 'cantidad']);

        return response()->json(['data' => $observaciones]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            // Granularidad mensual: siempre "AAAA-MM-01", nunca un día suelto.
            'periodo' => ['required', 'date'],
            'cantidad' => ['required', 'integer', 'min:0'],
        ]);

        // No se usa updateOrCreate(): el cast "date" del modelo guarda la
        // columna con hora (ej. "2024-01-01 00:00:00"), pero updateOrCreate
        // compara el valor exacto pasado ("2024-01-01", sin hora) — nunca
        // coinciden como string, así que nunca encuentra la fila existente
        // y choca con la restricción única al intentar duplicarla.
        // whereDate() sí compara por fecha sin importar la hora guardada.
        $periodo = Carbon::parse($data['periodo'])->toDateString();

        $observacion = Observacion::where('producto_id', $data['producto_id'])
            ->whereDate('periodo', $periodo)
            ->first();

        if ($observacion) {
            $observacion->update(['cantidad' => $data['cantidad']]);
        } else {
            $observacion = Observacion::create([
                'producto_id' => $data['producto_id'],
                'periodo' => $periodo,
                'cantidad' => $data['cantidad'],
            ]);
        }

        return response()->json(['data' => $observacion], 201);
    }

    public function destroy(Observacion $observacion)
    {
        $observacion->delete();

        return response()->noContent();
    }
}
