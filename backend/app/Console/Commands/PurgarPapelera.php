<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\Auth\Auditoria;
use Modules\Auth\PapeleraController;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;

// Corre una vez al día (ver routes/console.php) y borra para siempre lo que
// lleve más de 30 días en la papelera. user_id=null en la auditoría: esto
// no lo dispara ninguna persona, lo dispara el cron.
class PurgarPapelera extends Command
{
    protected $signature = 'papelera:purgar';

    protected $description = 'Elimina para siempre lo que lleve más de '.PapeleraController::DIAS_PARA_PURGAR.' días en la papelera';

    private const TIPOS = [
        'productos' => [Producto::class, 'Producto'],
        'observaciones' => [Observacion::class, 'Observacion'],
        'usuarios' => [User::class, 'Usuario'],
    ];

    public function handle(): void
    {
        $limite = now()->subDays(PapeleraController::DIAS_PARA_PURGAR);
        $total = 0;

        foreach (self::TIPOS as [$clase, $entidad]) {
            $registros = $clase::onlyTrashed()->where('deleted_at', '<=', $limite)->get();

            foreach ($registros as $registro) {
                Auditoria::registrar(
                    'eliminar_permanente',
                    $entidad,
                    $registro->id,
                    "Purga automática ({$entidad} #{$registro->id}, llevaba más de ".PapeleraController::DIAS_PARA_PURGAR.' días en la papelera)',
                    usuarioId: null,
                );
                $registro->forceDelete();
                $total++;
            }
        }

        $this->info("Purgados {$total} registros de la papelera.");
    }
}
