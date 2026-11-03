<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ObservacionController
{
    /**
     * Lista las observaciones (periodos capturados) de un producto, en
     * orden cronológico. Ambos roles pueden consultar.
     */
    public function index(Request $request)
    {
        $request->validate(['producto_id' => ['required', 'integer', 'exists:productos,id']]);

        $observaciones = Observacion::where('producto_id', $request->integer('producto_id'))
            ->orderBy('periodo')
            ->get(['id', 'periodo', 'cantidad']);

        return response()->json(['data' => $observaciones]);
    }

    /**
     * Captura (o corrige, si ya existía) la demanda de un producto en un
     * periodo. Solo administrador — es la puerta de entrada de los datos
     * que alimentan el pronóstico.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            // Se manda el mes como "AAAA-MM-01"; el front siempre pide mes,
            // nunca un día suelto — la granularidad de este recorte es mensual.
            'periodo' => ['required', 'date'],
            'cantidad' => ['required', 'integer', 'min:0'],
        ]);

        // No se usa updateOrCreate() a propósito: el cast "date" del modelo
        // guarda la columna con hora (ej. "2024-01-01 00:00:00"), pero
        // updateOrCreate compara el valor exacto que se le pasa ("2024-01-01",
        // sin hora) — nunca coinciden como string, así que nunca encuentra
        // la fila que ya existe y choca con la restricción única al
        // intentar insertar un duplicado. whereDate() sí compara por fecha
        // sin importar la hora guardada.
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

    /**
     * Borra una observación capturada por error. Solo administrador.
     */
    public function destroy(Observacion $observacion)
    {
        $observacion->delete();

        return response()->noContent();
    }
}
