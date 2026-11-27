import Desplegable from './Desplegable'
import { IconoBuscar } from './Iconos'
import { Entrada } from './ui'

// Mismo patrón en todas las pantallas con lista (Productos, Usuarios,
// Observaciones, Papelera, Auditoría): buscador a la izquierda + uno o dos
// desplegables de filtro a la derecha, siempre en el mismo lugar — debajo
// del título, encima de la tabla.
export default function BarraFiltros({ busqueda, onBusqueda, placeholderBusqueda, filtros = [] }) {
  if (!onBusqueda && filtros.length === 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      {onBusqueda && (
        <div className="relative flex-1">
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-sec" />
          <Entrada
            type="search"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder={placeholderBusqueda ?? 'Buscar…'}
            aria-label={placeholderBusqueda ?? 'Buscar'}
            className="pl-9"
          />
        </div>
      )}
      {filtros.map((f) => (
        <div key={f.id} className="sm:w-56">
          <Desplegable id={f.id} value={f.value} onChange={f.onChange} opciones={f.opciones} />
        </div>
      ))}
    </div>
  )
}
