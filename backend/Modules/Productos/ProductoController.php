<?php

namespace Modules\Productos;

use Illuminate\Http\Request;

// Auditoria::registrar() ya no se llama acá — crear/editar/eliminar queda
// auditado solo por los triggers de la base de datos sobre "productos" (ver
// database/migrations/..._create_triggers_auditoria_productos.php). Lo
// único que le toca a este controlador es dejar escrito "actor_id" (quién
// hizo la mutación) en la MISMA sentencia que cambia la fila — el trigger
// lee esa columna para saber a quién atribuirle el registro.
class ProductoController
{
    public function index()
    {
        return response()->json([
            'data' => ProductoResource::collection(Producto::orderBy('nombre')->get()),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo'],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto = Producto::create([...$data, 'actor_id' => $request->user()->id]);

        return response()->json(['data' => new ProductoResource($producto)], 201);
    }

    public function update(Request $request, Producto $producto)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo,'.$producto->id],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto->update([...$data, 'actor_id' => $request->user()->id]);

        return response()->json(['data' => new ProductoResource($producto)]);
    }

    // Soft delete: las observaciones históricas lo siguen referenciando, y
    // queda restaurable desde la papelera (Modules\Auth\PapeleraController).
    //
    // Dos sentencias a propósito: la primera solo dice "actor_id" (el
    // trigger de UPDATE la ignora porque código/nombre no cambiaron), la
    // segunda es el soft delete real (deleted_at), que sí dispara "eliminar"
    // — ya con el actor correcto puesto desde la de arriba.
    public function destroy(Request $request, Producto $producto)
    {
        $producto->update(['actor_id' => $request->user()->id]);
        $producto->delete();

        return response()->noContent();
    }
}
