<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

// Auditoria::registrar() ya no se llama acá — crear/corregir/eliminar queda
// auditado solo por los triggers de la base de datos sobre "observaciones"
// (ver database/migrations/..._create_triggers_auditoria_observaciones.php).
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
            $observacion->update(['cantidad' => $data['cantidad'], 'actor_id' => $request->user()->id]);
        } else {
            $observacion = Observacion::create([
                'producto_id' => $data['producto_id'],
                'periodo' => $periodo,
                'cantidad' => $data['cantidad'],
                'actor_id' => $request->user()->id,
            ]);
        }

        return response()->json(['data' => $observacion], 201);
    }

    // Soft delete: queda restaurable desde la papelera
    // (Modules\Auth\PapeleraController). Dos sentencias a propósito — ver
    // el comentario igual en ProductoController::destroy().
    public function destroy(Request $request, Observacion $observacion)
    {
        $observacion->update(['actor_id' => $request->user()->id]);
        $observacion->delete();

        return response()->noContent();
    }
}
