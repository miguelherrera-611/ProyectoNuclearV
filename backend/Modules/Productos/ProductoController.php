<?php

namespace Modules\Productos;

use Illuminate\Http\Request;
use Modules\Auth\Auditoria;

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

        $producto = Producto::create($data);

        Auditoria::registrar('crear', 'Producto', $producto->id, "Creó el producto {$producto->codigo} ({$producto->nombre})");

        return response()->json(['data' => new ProductoResource($producto)], 201);
    }

    public function update(Request $request, Producto $producto)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo,'.$producto->id],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto->update($data);

        Auditoria::registrar('editar', 'Producto', $producto->id, "Editó el producto {$producto->codigo} ({$producto->nombre})");

        return response()->json(['data' => new ProductoResource($producto)]);
    }

    // Soft delete: las observaciones históricas lo siguen referenciando, y
    // queda restaurable desde la papelera (Modules\Auth\PapeleraController).
    public function destroy(Producto $producto)
    {
        Auditoria::registrar('eliminar', 'Producto', $producto->id, "Eliminó el producto {$producto->codigo} ({$producto->nombre})");

        $producto->delete();

        return response()->noContent();
    }
}
