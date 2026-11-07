<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;

class PronosticoController
{
    // Mapeo chico clave→clase en vez de una clase de registro aparte — el
    // módulo se queda plano. Agregar un método nuevo (P2, P3, P5, P6) es
    // sumar una línea acá más su propia clase.
    private const METODOS = [
        'promedio_movil_simple' => PromedioMovilSimple::class,
        'suavizacion_exponencial_tendencia' => SuavizacionExponencialTendencia::class,
    ];

    public function calcular(Request $request)
    {
        $data = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            'metodo' => ['required', 'string', 'in:'.implode(',', array_keys(self::METODOS))],
            'n' => ['required_if:metodo,promedio_movil_simple', 'integer', 'min:2'],
            'alpha' => ['required_if:metodo,suavizacion_exponencial_tendencia', 'numeric', 'gt:0', 'lte:1'],
            'beta' => ['required_if:metodo,suavizacion_exponencial_tendencia', 'numeric', 'gt:0', 'lte:1'],
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

        if ($data['metodo'] === 'promedio_movil_simple' && $data['n'] >= count($observaciones)) {
            return response()->json([
                'message' => 'n debe ser menor que la cantidad de periodos capturados ('.count($observaciones).').',
            ], 422);
        }

        $metodo = app(self::METODOS[$data['metodo']]);
        $parametros = $data['metodo'] === 'promedio_movil_simple'
            ? ['n' => $data['n']]
            : ['alpha' => $data['alpha'], 'beta' => $data['beta']];

        $resultado = $metodo->calcular($observaciones, $parametros);

        return response()->json(['data' => $resultado]);
    }
}
