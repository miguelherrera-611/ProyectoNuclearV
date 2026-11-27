import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTour } from '../tour/TourContext'
import { IconoX } from './Iconos'
import { Boton } from './ui'

// Estimado del alto del panel inferior — para que el elemento señalado no
// quede tapado por él al desplazar la pantalla.
const ALTURA_PANEL_ESTIMADA = 280
const MARGEN = 8

function medir(el) {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

// Prueba los selectores en orden (sirve para apuntar a la versión visible —
// móvil o escritorio — de una misma sección) y descarta los que existen en
// el DOM pero están ocultos (ancho/alto 0).
function buscarElementoVisible(selectores) {
  for (const selector of selectores ?? []) {
    const el = document.querySelector(selector)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return el
    }
  }
  return null
}

// Guía interactiva: oscurece todo menos la sección señalada, se desplaza
// solo hasta ella y explica qué hace — un paso por sección/flujo real, nunca
// detalles obvios de interfaz. Si el elemento de un paso no existe todavía
// (p. ej. sin datos cargados aún, o sin resultado calculado), se degrada a
// una tarjeta centrada sin resaltado en vez de romperse.
export default function Tour() {
  const { activo, paso, indice, total, siguiente, anterior, detener } = useTour()
  const location = useLocation()
  const navigate = useNavigate()
  const [rectInterno, setRect] = useState(null)
  // El paso solo se muestra mientras la guía está activa — así no hay que
  // limpiar el estado al desactivarla, ni dispararlo desde el efecto.
  const rect = activo && paso ? rectInterno : null
  const yaEnfocado = useRef(false)

  useEffect(() => {
    if (activo && paso && location.pathname !== paso.ruta) {
      navigate(paso.ruta)
    }
  }, [activo, paso, location.pathname, navigate])

  useEffect(() => {
    yaEnfocado.current = false
    if (!activo || !paso) {
      return
    }

    let vivo = true
    let frame

    function tick() {
      if (!vivo) return
      const el = buscarElementoVisible(paso.selectores)
      if (el) {
        if (!yaEnfocado.current) {
          yaEnfocado.current = true
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            if (!vivo) return
            const r = el.getBoundingClientRect()
            const limite = window.innerHeight - ALTURA_PANEL_ESTIMADA
            if (r.bottom > limite) {
              window.scrollBy({ top: r.bottom - limite + 16, behavior: 'smooth' })
            }
          }, 350)
        }
        setRect(medir(el))
      } else {
        setRect(null)
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      vivo = false
      cancelAnimationFrame(frame)
    }
  }, [activo, paso])

  useEffect(() => {
    if (!activo) return
    function onKeyDown(event) {
      if (event.key === 'Escape') detener()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activo, detener])

  if (!activo || !paso) return null

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Guía: ${paso.titulo}`}>
      {rect ? (
        <>
          <div className="fixed bg-noche/75" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - MARGEN) }} />
          <div
            className="fixed bg-noche/75"
            style={{ top: rect.top + rect.height + MARGEN, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="fixed bg-noche/75"
            style={{ top: rect.top - MARGEN, left: 0, width: Math.max(0, rect.left - MARGEN), height: rect.height + MARGEN * 2 }}
          />
          <div
            className="fixed bg-noche/75"
            style={{ top: rect.top - MARGEN, left: rect.left + rect.width + MARGEN, right: 0, height: rect.height + MARGEN * 2 }}
          />
          <div
            className="fixed rounded-lg ring-2 ring-cian"
            style={{ top: rect.top - MARGEN, left: rect.left - MARGEN, width: rect.width + MARGEN * 2, height: rect.height + MARGEN * 2 }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-noche/75" />
      )}

      <div className="fixed inset-x-0 bottom-0 flex justify-center px-4 pb-4 sm:pb-6">
        <div className="w-full max-w-lg rounded-xl border border-borde bg-tarjeta p-5 shadow-lg sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-texto-sec">
              Paso {indice + 1} de {total}
            </p>
            <button
              type="button"
              onClick={detener}
              aria-label="Cerrar guía"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-texto-sec hover:bg-texto/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <IconoX className="size-4" />
            </button>
          </div>
          <h2 className="mt-1 font-display text-lg font-bold text-texto">{paso.titulo}</h2>
          <p className="mt-2 text-sm text-texto-sec">{paso.descripcion}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Boton variante="secundario" onClick={anterior} disabled={indice === 0}>
              Anterior
            </Boton>
            <div className="flex gap-3">
              <Boton variante="texto" onClick={detener}>
                Saltar
              </Boton>
              <Boton onClick={siguiente}>{indice + 1 === total ? 'Terminar' : 'Siguiente'}</Boton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
