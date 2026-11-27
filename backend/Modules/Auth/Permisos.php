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
        'productos.eliminar' => 'Eliminar productos',
        'observaciones.capturar' => 'Capturar observaciones',
        'observaciones.eliminar' => 'Eliminar observaciones',
        'usuarios.ver' => 'Ver usuarios',
        'usuarios.crear' => 'Crear y editar usuarios',
        'usuarios.eliminar' => 'Eliminar usuarios',
        'pronostico.calcular' => 'Calcular pronóstico',
        'papelera.ver' => 'Ver la papelera',
        'papelera.restaurar' => 'Restaurar de la papelera',
        'papelera.eliminar_permanente' => 'Eliminar para siempre desde la papelera',
        'auditoria.ver' => 'Ver la auditoría',
    ];

    // Lo que trae un usuario NUEVO según el rol elegido — es solo el punto
    // de partida que ve el administrador en el formulario; de ahí puede
    // marcar o desmarcar lo que quiera para esa persona en particular.
    public const DEFAULT_POR_ROL = [
        User::ROLE_ADMINISTRADOR => [
            'productos.crear',
            'productos.editar',
            'productos.eliminar',
            'observaciones.capturar',
            'observaciones.eliminar',
            'usuarios.ver',
            'usuarios.crear',
            'usuarios.eliminar',
            'pronostico.calcular',
            'papelera.ver',
            'papelera.restaurar',
            'papelera.eliminar_permanente',
            'auditoria.ver',
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
