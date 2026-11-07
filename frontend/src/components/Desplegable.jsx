import { useState } from 'react'
import { usePopover } from './usePopover'

const ESTILO_CAMPO =
  'block min-h-11 w-full rounded-lg border border-campo bg-tarjeta px-3 py-2 text-left text-base text-texto focus:outline-2 focus:-outline-offset-1 focus:outline-foco sm:text-sm'

// Dropdown con estilo propio (reemplazo de <Selector>, que es un <select>
// nativo sin control sobre cómo se ve la lista desplegada). Mismo contrato
// visual que los demás campos (ESTILO_CAMPO de ui.jsx), navegable con
// teclado igual que un <select> nativo.
export default function Desplegable({ id, value, onChange, opciones, marcador = 'Selecciona…' }) {
  const { abierto, alternar, cerrar, refContenedor } = usePopover()
  const [resaltado, setResaltado] = useState(0)

  const indiceActual = opciones.findIndex((o) => String(o.valor) === String(value))
  const opcionActual = indiceActual >= 0 ? opciones[indiceActual] : null

  function elegir(opcion) {
    onChange(opcion.valor)
    cerrar()
  }

  // Todo el teclado se maneja acá, en el botón (nunca se mueve el foco real
  // a la lista) — si no, las flechas después de abrir terminan reabriendo o
  // cerrando el menú en vez de moverse entre opciones.
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
      setResaltado((i) => Math.min(i + 1, opciones.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (opciones[resaltado]) elegir(opciones[resaltado])
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
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-campo bg-tarjeta shadow-lg"
        >
          {opciones.map((opcion, i) => (
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
      )}
    </div>
  )
}
