// Formato numérico en español/Colombia (RNF-16 del documento de
// requisitos): separador de miles con punto, decimales con coma — ej.
// "1.248,5" en vez de "1,248.5".

export function formatearNumero(valor, decimales = 2) {
  if (valor === null || valor === undefined) return '/'
  return Number(valor).toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

export function formatearPorcentaje(valor, decimales = 2) {
  if (valor === null || valor === undefined) return '/'
  return `${formatearNumero(valor, decimales)}%`
}

export function formatearPeriodo(fechaIso) {
  // "2024-01-01" -> "ene 2024"
  const fecha = new Date(`${fechaIso}T00:00:00`)
  return fecha.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}
