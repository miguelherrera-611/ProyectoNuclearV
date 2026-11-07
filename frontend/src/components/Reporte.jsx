import { useState } from 'react'
import { formatearFechaLarga } from '../format'

// Encabezado y pie del reporte PDF (guía, sección 7). Solo existen al
// imprimir ("Exportar reporte" → Guardar como PDF): en pantalla no se ven.
// Al imprimir los tokens siempre valen los del modo claro (ver index.css).
export function EncabezadoReporte({ subtitulo }) {
  return (
    <div className="mb-6 hidden print:block">
      <div className="h-4 bg-principal" />
      <h1 className="mt-6 font-display text-3xl font-bold uppercase text-texto">Reporte de pronóstico</h1>
      {subtitulo && <p className="mt-1 text-texto">{subtitulo}</p>}
    </div>
  )
}

export function PieReporte() {
  const [generado] = useState(() => new Date())

  return (
    <p className="mt-8 hidden text-sm text-texto-sec print:block">
      Generado {formatearFechaLarga(generado)} · JR Mecanizados Industriales · Armenia, Quindío
    </p>
  )
}
