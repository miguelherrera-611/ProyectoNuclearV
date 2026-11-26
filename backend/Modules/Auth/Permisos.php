<?php

namespace Modules\Auth;

// Catálogo único de permisos: de acá sale tanto el Gate que autoriza cada
// ruta (ver AppServiceProvider) como el catálogo que consume el frontend
// para pintar el checklist al crear/editar un usuario. Un solo lugar para
// no tener la lista duplicada y que se desincronicen.
final class Permisos
{
    public const TODAS = [
        'productos.crear' => 'Crear productos',
        'productos.editar' => 'Editar productos',
        'productos.dar_de_baja' => 'Dar de baja productos',
        'observaciones.capturar' => 'Capturar observaciones',
        'observaciones.eliminar' => 'Eliminar observaciones',
        'usuarios.ver' => 'Ver usuarios',
        'usuarios.crear' => 'Crear y editar usuarios',
        'pronostico.calcular' => 'Calcular pronóstico',
    ];

    // Lo que trae un usuario NUEVO según el rol elegido — es solo el punto
    // de partida que ve el administrador en el formulario; de ahí puede
    // marcar o desmarcar lo que quiera para esa persona en particular.
    public const DEFAULT_POR_ROL = [
        User::ROLE_ADMINISTRADOR => [
            'productos.crear',
            'productos.editar',
            'productos.dar_de_baja',
            'observaciones.capturar',
            'observaciones.eliminar',
            'usuarios.ver',
            'usuarios.crear',
            'pronostico.calcular',
        ],
        User::ROLE_GERENTE => [
            'pronostico.calcular',
        ],
    ];

    public static function defaultParaRol(string $rol): array
    {
        return self::DEFAULT_POR_ROL[$rol] ?? [];
    }

    // Nunca se guarda una clave que no exista en el catálogo (si el
    // frontend quedara desactualizado, no se cuelan permisos fantasma).
    public static function filtrarValidas(array $claves): array
    {
        return array_values(array_intersect($claves, array_keys(self::TODAS)));
    }
}
