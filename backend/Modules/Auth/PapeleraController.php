<?php

namespace Modules\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;

// Punto único para ver/restaurar/purgar lo que haya en la papelera, sin
// importar de cuál de los 3 modelos venga (Producto, Observacion, Usuario)
// — una sola pantalla en el frontend en vez de tres.
class PapeleraController
{
    private const TIPOS = [
        'productos' => Producto::class,
        'observaciones' => Observacion::class,
        'usuarios' => User::class,
    ];

    public const DIAS_PARA_PURGAR = 30;

    public function index(): JsonResponse
    {
        $items = [];

        foreach (self::TIPOS as $tipo => $clase) {
            foreach ($clase::onlyTrashed()->get() as $registro) {
                $items[] = [
                    'tipo' => $tipo,
                    'id' => $registro->id,
                    'descripcion' => self::describir($tipo, $registro),
                    'eliminado_en' => $registro->deleted_at,
                    'se_purga_en' => $registro->deleted_at->copy()->addDays(self::DIAS_PARA_PURGAR),
                ];
            }
        }

        usort($items, fn ($a, $b) => $b['eliminado_en']->timestamp <=> $a['eliminado_en']->timestamp);

        return response()->json(['data' => $items]);
    }

    public function restaurar(string $tipo, int $id): JsonResponse
    {
        $registro = $this->buscarEnPapelera($tipo, $id);

        $descripcion = self::describir($tipo, $registro);
        $registro->restore();

        Auditoria::registrar('restaurar', self::entidadDe($tipo), $id, "Restauró: {$descripcion}");

        return response()->json(['data' => ['tipo' => $tipo, 'id' => $id]]);
    }

    // Pide la contraseña de quien está haciendo la acción (no la del
    // registro que se va a borrar, obvio) como una confirmación extra: esto
    // sí no tiene papelera detrás, no hay vuelta atrás.
    public function eliminarPermanente(Request $request, string $tipo, int $id): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->string('password'), $request->user()->password)) {
            return response()->json(['message' => 'Contraseña incorrecta.'], 422);
        }

        $registro = $this->buscarEnPapelera($tipo, $id);

        $descripcion = self::describir($tipo, $registro);
        $registro->forceDelete();

        Auditoria::registrar('eliminar_permanente', self::entidadDe($tipo), $id, "Eliminó para siempre: {$descripcion}");

        return response()->json(['data' => ['tipo' => $tipo, 'id' => $id]]);
    }

    private function buscarEnPapelera(string $tipo, int $id)
    {
        $clase = self::TIPOS[$tipo] ?? null;
        abort_if($clase === null, 404, 'Tipo de papelera desconocido.');

        return $clase::onlyTrashed()->findOrFail($id);
    }

    private static function entidadDe(string $tipo): string
    {
        return match ($tipo) {
            'productos' => 'Producto',
            'observaciones' => 'Observacion',
            'usuarios' => 'Usuario',
        };
    }

    private static function describir(string $tipo, $registro): string
    {
        return match ($tipo) {
            'productos' => "{$registro->codigo} ({$registro->nombre})",
            'observaciones' => "Producto #{$registro->producto_id} · {$registro->periodo->toDateString()} ({$registro->cantidad} u)",
            'usuarios' => "{$registro->name} ({$registro->email})",
        };
    }
}
