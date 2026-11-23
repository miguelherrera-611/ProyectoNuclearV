import { useEffect, useState } from 'react'

// Paginación de una lista que ya está completa en memoria (no pide más
// páginas al backend, solo decide cuánto mostrar de una vez). `resetKey`
// es opcional: cuando cambia (ej. se recalculó un pronóstico, o cambió el
// producto), vuelve a la página 1 en vez de dejar al usuario viendo una
// tabla vacía o la página 3 de un resultado nuevo.
export function usePaginacion(cantidadTotal, porPagina = 10, resetKey) {
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    setPagina(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const totalPaginas = Math.max(1, Math.ceil(cantidadTotal / porPagina))

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas)
  }, [pagina, totalPaginas])

  const inicio = (pagina - 1) * porPagina
  const fin = Math.min(inicio + porPagina, cantidadTotal)

  return {
    pagina,
    setPagina,
    totalPaginas,
    inicio,
    fin,
    porPagina,
    total: cantidadTotal,
    // Recorta un array a la página actual (para listas simples: Productos,
    // Observaciones, tarjetas de celular).
    slice: (lista) => lista.slice(inicio, fin),
    // Para tablas que también se imprimen (Dashboard, Pronóstico): en vez de
    // recortar el array y duplicar la tabla completa solo para el reporte en
    // PDF, cada fila se oculta en pantalla si quedó fuera de la página pero
    // se muestra igual al imprimir — el reporte siempre sale completo.
    claseFila: (indice) => (indice >= inicio && indice < fin ? '' : 'hidden print:table-row'),
  }
}
