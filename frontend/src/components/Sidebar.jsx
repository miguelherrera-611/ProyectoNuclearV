import { NavLink } from 'react-router-dom'
import { IconoInicio, IconoProductos, IconoPronostico, IconoX } from './Iconos'

const ENLACES = [
  { a: '/', texto: 'Inicio', exacto: true, Icono: IconoInicio },
  { a: '/productos', texto: 'Productos', Icono: IconoProductos },
  { a: '/pronostico', texto: 'Pronóstico', Icono: IconoPronostico },
]

const FOCO_BARRA = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian'

function Enlaces({ onNavegar }) {
  function claseEnlace({ isActive }) {
    return `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${FOCO_BARRA} ${
      isActive
        ? 'bg-tarjeta text-principal'
        : 'text-barra-texto hover:bg-barra-texto/10'
    }`
  }

  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
      {ENLACES.map(({ a, texto, exacto, Icono }) => (
        <NavLink key={a} to={a} end={exacto} onClick={onNavegar} className={claseEnlace}>
          <Icono className="size-5 shrink-0" />
          {texto}
        </NavLink>
      ))}
    </nav>
  )
}

// Navegación de la app (antes vivía en la barra superior horizontal): franja
// índigo con texto blanco en claro, tarjeta oscura con línea cian en oscuro
// — mismos tokens que ya usaba la barra (sección 6 de la guía), solo que
// ahora es la columna fija de la izquierda en vez del encabezado.
export default function Sidebar({ abierto, alCerrar }) {
  return (
    <>
      {/* Desktop: columna fija, siempre visible, pegada a la izquierda. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-barra-linea bg-barra py-6 text-barra-texto md:flex print:hidden">
        <div className="mb-6 px-4">
          <span className="font-display text-lg font-bold text-barra-texto">JR Forecast</span>
        </div>
        <Enlaces />
      </aside>

      {/* Móvil: panel deslizante sobre una cortina oscura, se cierra tocando
          afuera, con Equis, o al elegir una sección. */}
      {abierto && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-noche/60" aria-hidden="true" onClick={alCerrar} />
          <aside className="relative flex w-72 max-w-[80vw] flex-col bg-barra py-6 text-barra-texto shadow-xl">
            <div className="mb-6 flex items-center justify-between px-4">
              <span className="font-display text-lg font-bold text-barra-texto">JR Forecast</span>
              <button
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar menú"
                className={`flex size-9 items-center justify-center rounded-lg hover:bg-barra-texto/10 ${FOCO_BARRA}`}
              >
                <IconoX className="size-5" />
              </button>
            </div>
            <Enlaces onNavegar={alCerrar} />
          </aside>
        </div>
      )}
    </>
  )
}
