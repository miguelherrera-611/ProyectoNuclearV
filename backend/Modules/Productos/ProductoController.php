<?php

namespace Modules\Productos;

use Illuminate\Http\Request;

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

        return response()->json(['data' => new ProductoResource($producto)], 201);
    }

    public function update(Request $request, Producto $producto)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo,'.$producto->id],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto->update($data);

        return response()->json(['data' => new ProductoResource($producto)]);
    }

    // Nunca se borra de verdad: las observaciones históricas lo referencian
    // y deben conservarse.
    public function destroy(Producto $producto)
    {
        $producto->update(['activo' => false]);

        return response()->noContent();
    }
}
