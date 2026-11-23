import { useEffect, useRef, useState } from 'react'
import { usePopover } from './usePopover'

const ESTILO_CAMPO =
  'block min-h-11 w-full rounded-lg border border-campo bg-tarjeta px-3 py-2 text-left text-base text-texto focus:outline-2 focus:-outline-offset-1 focus:outline-foco sm:text-sm'

// A partir de cuántas opciones aparece el buscador arriba de la lista — con
// pocas (ej. el selector de "Método", con 6) no hace falta y solo estorba.
const UMBRAL_BUSCADOR = 8

// Dropdown con estilo propio (reemplazo de <Selector>, que es un <select>
// nativo sin control sobre cómo se ve la lista desplegada). Mismo contrato
// visual que los demás campos (ESTILO_CAMPO de ui.jsx), navegable con
// teclado igual que un <select> nativo. Con listas largas (ej. productos),
// agrega una caja de texto arriba para escribir y filtrar.
export default function Desplegable({ id, value, onChange, opciones, marcador = 'Selecciona…' }) {
  const { abierto, alternar, cerrar, refContenedor } = usePopover()
  const [resaltado, setResaltado] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const refBuscador = useRef(null)

  const conBuscador = opciones.length > UMBRAL_BUSCADOR
  const opcionesFiltradas = conBuscador
    ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : opciones

  const indiceActual = opciones.findIndex((o) => String(o.valor) === String(value))
  const opcionActual = indiceActual >= 0 ? opciones[indiceActual] : null

  useEffect(() => {
    if (!abierto) {
      setBusqueda('')
      return
    }
    setResaltado(0)
    if (conBuscador) refBuscador.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Si la búsqueda deja menos opciones que el índice resaltado, no se queda
  // apuntando a una fila que ya no existe.
  useEffect(() => {
    setResaltado((i) => Math.min(i, Math.max(0, opcionesFiltradas.length - 1)))
  }, [opcionesFiltradas.length])

  function elegir(opcion) {
    onChange(opcion.valor)
    cerrar()
  }

  // Todo el teclado se maneja acá (nunca se mueve el foco real a la lista) —
  // si no, las flechas después de abrir terminan reabriendo o cerrando el
  // menú en vez de moverse entre opciones. Cuando hay buscador, este mismo
  // manejador va en el <input>, no en el botón.
  function manejarTecla(event) {
    if (!abierto) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setResaltado(indiceActual >= 0 ? indiceActual : 0)
        alternar()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setResaltado((i) => Math.min(i + 1, opcionesFiltradas.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (opcionesFiltradas[resaltado]) elegir(opcionesFiltradas[resaltado])
    } else if (event.key === ' ' && event.target !== refBuscador.current) {
      event.preventDefault()
      if (opcionesFiltradas[resaltado]) elegir(opcionesFiltradas[resaltado])
    }
  }

  return (
    <div ref={refContenedor} className="relative">
      <button
        type="button"
        id={id}
        onClick={alternar}
        onKeyDown={manejarTecla}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`${ESTILO_CAMPO} flex items-center justify-between gap-2`}
      >
        <span className={opcionActual ? '' : 'text-texto-sec'}>{opcionActual?.etiqueta ?? marcador}</span>
        <span aria-hidden="true" className="shrink-0 text-texto-sec">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-campo bg-tarjeta shadow-lg">
          {conBuscador && (
            <input
              ref={refBuscador}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={manejarTecla}
              placeholder="Buscar…"
              aria-label="Buscar en la lista"
              className="block w-full border-b border-campo bg-tarjeta px-3 py-2 text-base text-texto placeholder:text-texto-sec focus:outline-none sm:text-sm"
            />
          )}
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {opcionesFiltradas.length === 0 && (
              <li className="px-3 py-2 text-sm text-texto-sec">Sin resultados.</li>
            )}
            {opcionesFiltradas.map((opcion, i) => (
              <li
                key={opcion.valor}
                role="option"
                aria-selected={String(opcion.valor) === String(value)}
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(opcion)}
                className={`min-h-11 cursor-pointer px-3 py-2 text-base sm:text-sm ${
                  i === resaltado ? 'bg-principal text-sobre-principal' : 'text-texto'
                }`}
              >
                {opcion.etiqueta}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
