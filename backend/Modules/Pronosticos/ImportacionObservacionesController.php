<?php

namespace Modules\Pronosticos;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Auth\Auditoria;
use Modules\Productos\Producto;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Throwable;

// Importar/exportar el histórico mensual de un producto como Excel, con el
// mismo formato que ya traían los archivos reales del cliente (AÑO, MES N°,
// MES, CANTIDAD) — la "plantilla" no es más que ese mismo formato, pre-
// llenado con lo que el producto ya tenga, para que agregar meses nuevos
// sea seguir la fila donde la dejaron.
class ImportacionObservacionesController
{
    private const MESES = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 5 => 'Mayo', 6 => 'Junio',
        7 => 'Julio', 8 => 'Agosto', 9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
    ];

    private const FILA_ENCABEZADO = 4;

    private const FILA_PRIMER_DATO = 5;

    private const FILAS_EN_BLANCO_EXTRA = 6;

    public function plantilla(Producto $producto)
    {
        $hoja = new Spreadsheet();
        $sheet = $hoja->getActiveSheet();
        $sheet->setTitle('Datos históricos');

        $sheet->setCellValue('A1', "PLANTILLA DE DATOS HISTÓRICOS — {$producto->nombre} ({$producto->codigo})");
        $sheet->mergeCells('A1:D1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);

        $sheet->setCellValue('A2', 'Una fila por mes. No cambies el orden de las columnas ni borres el encabezado de la fila 4.');
        $sheet->mergeCells('A2:D2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(10);

        foreach (['AÑO', 'MES N°', 'MES', 'CANTIDAD (UNIDADES)'] as $i => $titulo) {
            $sheet->setCellValue(chr(65 + $i).self::FILA_ENCABEZADO, $titulo);
        }
        $rangoEncabezado = 'A'.self::FILA_ENCABEZADO.':D'.self::FILA_ENCABEZADO;
        $sheet->getStyle($rangoEncabezado)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($rangoEncabezado)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('303B8F');

        // Pre-llena con lo que el producto ya tenga — así re-descargar la
        // plantilla es, en la práctica, "exportar para corregir o seguir".
        $existentes = Observacion::where('producto_id', $producto->id)->orderBy('periodo')->get(['periodo', 'cantidad']);

        $fila = self::FILA_PRIMER_DATO;
        foreach ($existentes as $obs) {
            $sheet->setCellValue("A{$fila}", $obs->periodo->year);
            $sheet->setCellValue("B{$fila}", $obs->periodo->month);
            $sheet->setCellValue("C{$fila}", self::MESES[$obs->periodo->month]);
            $sheet->setCellValue("D{$fila}", $obs->cantidad);
            $fila++;
        }

        foreach (range('A', 'D') as $columna) {
            $sheet->getColumnDimension($columna)->setAutoSize(true);
        }

        $nombreArchivo = 'plantilla-'.str($producto->codigo)->slug().'.xlsx';

        $writer = new Xlsx($hoja);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // Todo o nada: si una sola fila tiene un dato inválido, no se importa
    // nada — así nunca queda la base de datos "a medias" por un archivo mal
    // llenado. El mensaje de error dice exactamente qué fila corregir, para
    // que se pueda arreglar y volver a subir el mismo archivo.
    public function importar(Request $request, Producto $producto)
    {
        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        try {
            $hoja = IOFactory::load($request->file('archivo')->getRealPath());
        } catch (Throwable $e) {
            return response()->json(['message' => 'No se pudo leer el archivo. ¿Es un Excel válido?'], 422);
        }

        $sheet = $hoja->getActiveSheet();
        $filasTotales = $sheet->getHighestRow();

        $errores = [];
        $filasValidas = [];

        for ($fila = self::FILA_PRIMER_DATO; $fila <= $filasTotales; $fila++) {
            $anioCrudo = $sheet->getCell("A{$fila}")->getValue();
            $mesCrudo = $sheet->getCell("B{$fila}")->getValue();
            $cantidadCrudo = $sheet->getCell("D{$fila}")->getValue();

            // Fila completamente vacía (de las que se dejan de más al final
            // de la plantilla): se ignora en silencio, no es un error.
            if ($anioCrudo === null && $mesCrudo === null && $cantidadCrudo === null) {
                continue;
            }

            $anio = is_numeric($anioCrudo) ? (int) $anioCrudo : null;
            $mes = is_numeric($mesCrudo) ? (int) $mesCrudo : null;
            $cantidad = is_numeric($cantidadCrudo) ? (int) $cantidadCrudo : null;

            if ($anio === null || $anio < 2000 || $anio > 2100) {
                $errores[] = "Fila {$fila}: la columna AÑO debe ser un año válido (ej. 2026).";

                continue;
            }
            if ($mes === null || $mes < 1 || $mes > 12) {
                $errores[] = "Fila {$fila}: la columna MES N° debe ser un número de 1 a 12.";

                continue;
            }
            if ($cantidad === null || $cantidad < 0) {
                $errores[] = "Fila {$fila}: la columna CANTIDAD debe ser un número igual o mayor a 0.";

                continue;
            }

            $filasValidas[] = ['anio' => $anio, 'mes' => $mes, 'cantidad' => $cantidad];
        }

        if (empty($filasValidas) && empty($errores)) {
            return response()->json(['message' => 'El archivo no tiene ninguna fila con datos para importar.'], 422);
        }

        if (! empty($errores)) {
            return response()->json([
                'message' => 'El archivo tiene errores — corrígelos y vuelve a subirlo. No se importó nada.',
                'errores' => $errores,
            ], 422);
        }

        $creados = 0;
        $corregidos = 0;

        DB::transaction(function () use ($filasValidas, $producto, &$creados, &$corregidos) {
            foreach ($filasValidas as $f) {
                $periodo = sprintf('%04d-%02d-01', $f['anio'], $f['mes']);
                $observacion = Observacion::where('producto_id', $producto->id)->whereDate('periodo', $periodo)->first();

                if ($observacion) {
                    $observacion->update(['cantidad' => $f['cantidad']]);
                    $corregidos++;
                } else {
                    Observacion::create(['producto_id' => $producto->id, 'periodo' => $periodo, 'cantidad' => $f['cantidad']]);
                    $creados++;
                }
            }
        });

        Auditoria::registrar(
            'crear',
            'Observacion',
            $producto->id,
            "Importó datos históricos de {$producto->nombre} desde Excel: {$creados} meses nuevos, {$corregidos} corregidos.",
        );

        return response()->json(['data' => ['creados' => $creados, 'corregidos' => $corregidos, 'total' => $creados + $corregidos]]);
    }
}
