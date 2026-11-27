<?php

namespace Modules\Pronosticos;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use Modules\Productos\Producto;
use Modules\Productos\ProductoResource;

class PronosticoController
{
    // Mapeo chico clave→clase en vez de una clase de registro aparte — el
    // módulo se queda plano. Agregar un método nuevo (P5, P6) es sumar una
    // línea acá, sus reglas abajo y su propia clase (RNF-21).
    private const METODOS = [
        'promedio_movil_simple' => PromedioMovilSimple::class,
        'promedio_movil_ponderado' => PromedioMovilPonderado::class,
        'suavizamiento_exponencial' => SuavizamientoExponencial::class,
        'suavizacion_exponencial_tendencia' => SuavizacionExponencialTendencia::class,
        'regresion_lineal' => RegresionLineal::class,
        'estacional_multiplicativo' => EstacionalMultiplicativo::class,
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
            'suavizacion_exponencial_tendencia' => [
                'alpha' => ['required', 'numeric', 'gt:0', 'lte:1'],
                'beta' => ['required', 'numeric', 'gt:0', 'lte:1'],
            ],
            'regresion_lineal' => [],
            'estacional_multiplicativo' => [
                'periodo_corte' => ['nullable', 'date_format:Y-m'],
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

    // Mismos método + parámetros por defecto que el Dashboard del frontend
    // probaba uno por uno vía /pronosticos/calcular (RF-32: todavía no existe
    // un "método oficial" por producto).
    private const METODOS_DASHBOARD = [
        'promedio_movil_simple' => ['n' => 2],
        'promedio_movil_ponderado' => ['pesos' => [0.4, 0.6]],
        'suavizamiento_exponencial' => ['alpha' => 0.45],
        'suavizacion_exponencial_tendencia' => ['alpha' => 0.5, 'beta' => 0.5],
        'regresion_lineal' => [],
    ];

    public function resumen(): JsonResponse
    {
        // Sin where('activo', true): Producto ahora usa soft delete, así que
        // los eliminados ya quedan fuera por el scope global de Eloquent.
        $productos = Producto::orderBy('nombre')->get();
        $resumen = [];

        foreach ($productos as $producto) {
            $observaciones = Observacion::where('producto_id', $producto->id)
                ->orderBy('periodo')
                ->get(['periodo', 'cantidad'])
                ->map(fn ($o) => ['periodo' => $o->periodo->toDateString(), 'cantidad' => (float) $o->cantidad])
                ->all();

            $mejorClave = null;
            $mejorResultado = null;

            foreach (self::METODOS_DASHBOARD as $clave => $parametros) {
                try {
                    $resultado = app(self::METODOS[$clave])->calcular($observaciones, $parametros);
                } catch (InvalidArgumentException) {
                    continue;
                }

                if ($resultado['metricas']['mad'] === null) {
                    continue;
                }

                if ($mejorResultado === null || $resultado['metricas']['mad'] < $mejorResultado['metricas']['mad']) {
                    $mejorClave = $clave;
                    $mejorResultado = $resultado;
                }
            }

            if ($mejorResultado !== null) {
                $resumen[] = [
                    'producto' => new ProductoResource($producto),
                    'metodo' => $mejorClave,
                    'resultado' => $mejorResultado,
                ];
            }
        }

        return response()->json(['data' => $resumen]);
    }
}
