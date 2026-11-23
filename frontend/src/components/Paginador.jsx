const ESTILO_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'
const ESTILO_BOTON =
  'flex min-h-9 items-center rounded-lg border border-campo px-3 text-sm font-medium text-texto hover:border-texto disabled:cursor-not-allowed disabled:border-borde disabled:text-texto-sec'

// Pie compartido por las tablas largas: "1–10 de 42" + anterior/siguiente.
// No sale en el reporte impreso (ahí la tabla siempre va completa).
export default function Paginador({ pagina, totalPaginas, inicio, fin, total, onCambiar }) {
  if (totalPaginas <= 1) return null

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-borde px-4 py-3 text-sm print:hidden sm:flex-row">
      <p className="text-texto-sec">
        {inicio + 1}–{fin} de {total}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina === 1}
          className={`${ESTILO_BOTON} ${ESTILO_FOCO}`}
        >
          Anterior
        </button>
        <span className="whitespace-nowrap text-texto-sec">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina === totalPaginas}
          className={`${ESTILO_BOTON} ${ESTILO_FOCO}`}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
