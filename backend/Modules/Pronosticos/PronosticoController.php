<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class PronosticoController
{
    // Agregar un método nuevo es sumar una entrada acá y sus reglas abajo,
    // sin tocar las clases de los otros métodos (RNF-21).
    private const METODOS = [
        'promedio_movil_simple' => PromedioMovilSimple::class,
        'promedio_movil_ponderado' => PromedioMovilPonderado::class,
        'suavizamiento_exponencial' => SuavizamientoExponencial::class,
    ];

    public function calcular(Request $request)
    {
        $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            // Opcional para no romper a quien ya llama sin "metodo" (P1).
            'metodo' => ['sometimes', 'string', Rule::in(array_keys(self::METODOS))],
        ]);

        $metodo = $request->input('metodo', 'promedio_movil_simple');

        $parametros = $request->validate(match ($metodo) {
            'promedio_movil_simple' => [
                'n' => ['required', 'integer', 'min:2'],
            ],
            'promedio_movil_ponderado' => [
                'pesos' => ['required', 'array', 'min:2'],
                'pesos.*' => ['required', 'numeric', 'min:0'],
            ],
            'suavizamiento_exponencial' => [
                'alpha' => ['required', 'numeric', 'gt:0', 'max:1'],
                'pronostico_inicial' => ['nullable', 'numeric', 'min:0'],
            ],
        });

        $observaciones = Observacion::where('producto_id', $request->integer('producto_id'))
            ->orderBy('periodo')
            ->get(['periodo', 'cantidad'])
            ->map(fn ($o) => ['periodo' => $o->periodo->toDateString(), 'cantidad' => (float) $o->cantidad])
            ->all();

        if (count($observaciones) < 2) {
            return response()->json([
                'message' => 'Hacen falta al menos 2 periodos capturados para calcular un pronóstico.',
            ], 422);
        }

        if ($metodo === 'promedio_movil_simple' && $parametros['n'] >= count($observaciones)) {
            return response()->json([
                'message' => 'n debe ser menor que la cantidad de periodos capturados ('.count($observaciones).').',
            ], 422);
        }

        try {
            $resultado = app(self::METODOS[$metodo])->calcular($observaciones, $parametros);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $resultado]);
    }
}
