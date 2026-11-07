import { useState } from 'react'
import { formatearPeriodo } from '../format'
import { usePopover } from './usePopover'

const ESTILO_CAMPO =
  'block min-h-11 w-full rounded-lg border border-campo bg-tarjeta px-3 py-2 text-left text-base text-texto focus:outline-2 focus:-outline-offset-1 focus:outline-foco sm:text-sm'

function nombreMes(anio, mes) {
  const texto = new Date(anio, mes, 1).toLocaleDateString('es-CO', { month: 'short' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Selector de mes+año (reemplazo de <input type="month">, cuyo picker
// depende 100% del navegador — en Firefox de escritorio ni siquiera muestra
// uno). El sistema solo maneja granularidad mensual en toda la app, así que
// esto es una cuadrícula de 12 meses con flechas de año, no un calendario de
// días completo. Mismo valor "AAAA-MM" que el input nativo reemplazado.
export default function SelectorMes({ id, value, onChange, marcador = 'Selecciona un mes' }) {
  const { abierto, alternar, cerrar, refContenedor } = usePopover()

  const [anioValor, mesValor] = value ? value.split('-').map(Number) : [null, null]
  const [anioVisible, setAnioVisible] = useState(() => anioValor ?? new Date().getFullYear())

  function elegir(mesIndiceCero) {
    const mm = String(mesIndiceCero + 1).padStart(2, '0')
    onChange(`${anioVisible}-${mm}`)
    cerrar()
  }

  return (
    <div ref={refContenedor} className="relative">
      <button
        type="button"
        id={id}
        onClick={alternar}
        aria-haspopup="true"
        aria-expanded={abierto}
        className={`${ESTILO_CAMPO} flex items-center justify-between gap-2`}
      >
        <span className={value ? '' : 'text-texto-sec'}>{value ? formatearPeriodo(`${value}-01`) : marcador}</span>
        <span aria-hidden="true" className="shrink-0 text-texto-sec">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-xl border border-campo bg-tarjeta p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAnioVisible((a) => a - 1)}
              aria-label="Año anterior"
              className="flex min-h-11 min-w-11 items-center justify-center text-texto hover:bg-fila-alterna focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              ‹
            </button>
            <p className="font-display font-bold text-texto">{anioVisible}</p>
            <button
              type="button"
              onClick={() => setAnioVisible((a) => a + 1)}
              aria-label="Año siguiente"
              className="flex min-h-11 min-w-11 items-center justify-center text-texto hover:bg-fila-alterna focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, m) => {
              const esElegido = anioVisible === anioValor && m === mesValor - 1
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => elegir(m)}
                  aria-pressed={esElegido}
                  aria-label={`${nombreMes(anioVisible, m)} de ${anioVisible}`}
                  className={`min-h-11 px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                    esElegido ? 'bg-principal text-sobre-principal' : 'text-texto hover:bg-fila-alterna'
                  }`}
                >
                  {nombreMes(anioVisible, m)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
