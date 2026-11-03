<?php

namespace Modules\Productos;

use Illuminate\Http\Request;

class ProductoController
{
    /**
     * Lista todos los productos. Ambos roles pueden consultar.
     */
    public function index()
    {
        return response()->json([
            'data' => ProductoResource::collection(Producto::orderBy('nombre')->get()),
        ]);
    }

    /**
     * Crea un producto nuevo. Solo administrador (ver middleware 'admin' en routes.php).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo'],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto = Producto::create($data);

        return response()->json(['data' => new ProductoResource($producto)], 201);
    }

    /**
     * Edita nombre/código de un producto. Solo administrador.
     */
    public function update(Request $request, Producto $producto)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:50', 'unique:productos,codigo,'.$producto->id],
            'nombre' => ['required', 'string', 'max:150'],
        ]);

        $producto->update($data);

        return response()->json(['data' => new ProductoResource($producto)]);
    }

    /**
     * Da de baja un producto (nunca se borra de verdad: las observaciones
     * históricas lo referencian y deben conservarse). Solo administrador.
     */
    public function destroy(Producto $producto)
    {
        $producto->update(['activo' => false]);

        return response()->noContent();
    }
}
