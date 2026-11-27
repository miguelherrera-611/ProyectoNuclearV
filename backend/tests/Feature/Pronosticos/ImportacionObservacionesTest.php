<?php

namespace Tests\Feature\Pronosticos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Auth\User;
use Modules\Productos\Producto;
use Modules\Pronosticos\Observacion;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class ImportacionObservacionesTest extends TestCase
{
    use RefreshDatabase;

    private function tokenDe(string $rol): string
    {
        return User::factory()->create(['role' => $rol])->createToken('test')->plainTextToken;
    }

    // Construye un .xlsx real con el mismo formato de la plantilla (fila 4 =
    // encabezado, fila 5 en adelante = datos) — hace falta un archivo real
    // para que IOFactory::load() lo pueda leer, UploadedFile::fake() no sirve.
    private function construirExcel(array $filas): UploadedFile
    {
        $hoja = new Spreadsheet();
        $sheet = $hoja->getActiveSheet();
        $sheet->setCellValue('A4', 'AÑO');
        $sheet->setCellValue('B4', 'MES N°');
        $sheet->setCellValue('C4', 'MES');
        $sheet->setCellValue('D4', 'CANTIDAD (UNIDADES)');

        $fila = 5;
        foreach ($filas as $f) {
            $sheet->setCellValue("A{$fila}", $f[0]);
            $sheet->setCellValue("B{$fila}", $f[1]);
            $sheet->setCellValue("D{$fila}", $f[2]);
            $fila++;
        }

        $ruta = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        (new Xlsx($hoja))->save($ruta);

        return new UploadedFile($ruta, 'datos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    public function test_administrador_puede_descargar_la_plantilla(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $producto = Producto::factory()->create();
        Observacion::create(['producto_id' => $producto->id, 'periodo' => '2026-01-01', 'cantidad' => 500]);

        $response = $this->withToken($token)->get("/api/productos/{$producto->id}/observaciones/plantilla");

        $response->assertOk();
        $this->assertStringContainsString('spreadsheetml', $response->headers->get('Content-Type'));
    }

    public function test_gerente_sin_permiso_no_puede_descargar_la_plantilla(): void
    {
        $token = $this->tokenDe(User::ROLE_GERENTE);
        $producto = Producto::factory()->create();

        $this->withToken($token)->get("/api/productos/{$producto->id}/observaciones/plantilla")->assertForbidden();
    }

    public function test_importa_meses_nuevos_desde_excel(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $producto = Producto::factory()->create();

        $archivo = $this->construirExcel([
            [2026, 1, 1000],
            [2026, 2, 1200],
        ]);

        $response = $this->withToken($token)
            ->post("/api/productos/{$producto->id}/observaciones/importar", ['archivo' => $archivo]);

        $response->assertOk()->assertJsonPath('data.creados', 2)->assertJsonPath('data.corregidos', 0);
        $this->assertDatabaseHas('observaciones', ['producto_id' => $producto->id, 'periodo' => '2026-01-01 00:00:00', 'cantidad' => 1000]);
        $this->assertDatabaseHas('observaciones', ['producto_id' => $producto->id, 'periodo' => '2026-02-01 00:00:00', 'cantidad' => 1200]);
    }

    public function test_importar_corrige_un_mes_que_ya_existia(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $producto = Producto::factory()->create();
        Observacion::create(['producto_id' => $producto->id, 'periodo' => '2026-01-01', 'cantidad' => 999]);

        $archivo = $this->construirExcel([[2026, 1, 1500]]);

        $response = $this->withToken($token)
            ->post("/api/productos/{$producto->id}/observaciones/importar", ['archivo' => $archivo]);

        $response->assertOk()->assertJsonPath('data.creados', 0)->assertJsonPath('data.corregidos', 1);
        $this->assertDatabaseHas('observaciones', ['producto_id' => $producto->id, 'periodo' => '2026-01-01 00:00:00', 'cantidad' => 1500]);
        $this->assertDatabaseCount('observaciones', 1);
    }

    public function test_no_importa_nada_si_una_fila_tiene_un_mes_invalido(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $producto = Producto::factory()->create();

        $archivo = $this->construirExcel([
            [2026, 1, 1000],
            [2026, 13, 1200], // mes inválido
        ]);

        $response = $this->withToken($token)
            ->post("/api/productos/{$producto->id}/observaciones/importar", ['archivo' => $archivo]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Fila 6', $response->json('errores.0'));
        $this->assertDatabaseCount('observaciones', 0);
    }

    public function test_rechaza_un_archivo_que_no_es_excel(): void
    {
        $token = $this->tokenDe(User::ROLE_ADMINISTRADOR);
        $producto = Producto::factory()->create();

        $this->withToken($token)
            ->post("/api/productos/{$producto->id}/observaciones/importar", [
                'archivo' => UploadedFile::fake()->create('documento.pdf', 10),
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('observaciones', 0);
    }

    public function test_gerente_sin_permiso_no_puede_importar(): void
    {
        $token = $this->tokenDe(User::ROLE_GERENTE);
        $producto = Producto::factory()->create();

        $archivo = $this->construirExcel([[2026, 1, 1000]]);

        $this->withToken($token)
            ->post("/api/productos/{$producto->id}/observaciones/importar", ['archivo' => $archivo])
            ->assertForbidden();
    }
}
