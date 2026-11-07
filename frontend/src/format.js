// Formato numérico en español/Colombia (RNF-16 del documento de
// requisitos y sección 3 de la guía de identidad): separador de miles con
// punto, decimales con coma — ej. "1.248 u", "8,4 %".

export function formatearNumero(valor, decimales = 2) {
  if (valor === null || valor === undefined) return '/'
  return Number(valor).toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

// La guía pide las cifras siempre con su unidad ("u").
export function formatearUnidades(valor, decimales = 0) {
  if (valor === null || valor === undefined) return '/'
  return `${formatearNumero(valor, decimales)} u`
}

export function formatearPorcentaje(valor, decimales = 2) {
  if (valor === null || valor === undefined) return '/'
  return `${formatearNumero(valor, decimales)} %`
}

export function formatearPeriodo(fechaIso) {
  // El backend manda la fecha en dos formas distintas según el endpoint:
  // "2024-01-01" (el motor de pronóstico) o "2024-01-01T00:00:00.000000Z"
  // (las observaciones, serializadas directo desde un cast "date" de
  // Laravel). Se toman siempre los primeros 10 caracteres (AAAA-MM-DD)
  // antes de agregar la hora, para no terminar con un string inválido
  // tipo "...00.000000ZT00:00:00" cuando ya venía con hora incluida.
  const soloFecha = fechaIso.slice(0, 10)
  const fecha = new Date(`${soloFecha}T00:00:00`)
  const texto = fecha.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
  // Solo la primera letra en mayúscula ("Nov de 2026"); el CSS "capitalize"
  // pondría también "De".
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function formatearFechaLarga(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}
