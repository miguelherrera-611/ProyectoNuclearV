import { useEffect, useRef } from 'react'
import { formatearUnidades } from '../format'
import { COLORES_TEXTO } from '../tema/colores'
import { useTema } from '../tema/TemaContext'
import { Estado, Variacion } from './ui'

// Mismos colores que los recuadros de Estado (ui.jsx) — "en meta" verde,
// "revisar" ámbar — repetidos en JS porque dentro de un <path> de SVG las
// variables CSS no son confiables (mismo criterio que tema/colores.js).
const COLOR_ESTADO = { en_meta: '#32b77a', revisar: '#f0a43a' }

function arcoPath(cx, cy, r, inicioDeg, finDeg) {
  const toRad = (d) => (d * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(inicioDeg))
  const y1 = cy + r * Math.sin(toRad(inicioDeg))
  const x2 = cx + r * Math.cos(toRad(finDeg))
  const y2 = cy + r * Math.sin(toRad(finDeg))
  const grandeArco = finDeg - inicioDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${grandeArco} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// Retoma los anillos cian de la pantalla de acceso (components/
// PantallaAcceso.jsx): acá cada arco es un producto real — su ancho es
// cuánto pesa en el total proyectado, su color es si está en meta o hay que
// revisarlo — en vez de un número suelto y un conteo aparte ("3 de 5").
//
// productos: [{ id, nombre, volumen, estado: 'en_meta' | 'revisar' }]
export default function AnilloProduccion({ productos, total, variacionTotal }) {
  const { tema } = useTema()
  const texto = COLORES_TEXTO[tema]
  const svgRef = useRef(null)

  const cx = 140
  const cy = 140
  const r = 98
  const grosor = 22
  const hueco = 4
  const totalVolumen = productos.reduce((s, p) => s + p.volumen, 0) || 1

  const arcos = productos.reduce((acumulado, p) => {
    const anterior = acumulado.at(-1)
    const angulo = anterior ? anterior.angulo : -90
    const porcion = (p.volumen / totalVolumen) * 360
    const inicio = angulo + hueco / 2
    const fin = inicio + Math.max(porcion - hueco, 0.001)
    acumulado.push({ ...p, inicio, fin, angulo: angulo + porcion })
    return acumulado
  }, [])

  // El arco "crece" desde el centro al cargar — se salta si el usuario
  // prefiere menos movimiento (prefers-reduced-motion).
  useEffect(() => {
    const prefiereReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodos = svgRef.current?.querySelectorAll('path.arco') ?? []
    nodos.forEach((el, i) => {
      if (prefiereReducido) return
      const largo = el.getTotalLength()
      el.style.strokeDasharray = `${largo}`
      el.style.strokeDashoffset = `${largo}`
      el.style.transition = `stroke-dashoffset 0.7s cubic-bezier(.2,.8,.2,1) ${i * 70}ms`
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = '0'
      })
    })
  }, [productos])

  return (
    <div className="flex min-w-0 flex-col items-center gap-6 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="text-center">
          <span className="font-display text-xl font-bold" style={{ color: texto.texto }}>
            {formatearUnidades(total)}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: texto.secundario }}>
            unidades proyectadas
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 280 280"
          className="size-44"
          role="img"
          aria-label="Proporción de cada producto en el total proyectado, coloreada por estado"
        >
          {arcos.map((p) => (
            <path
              key={p.id}
              className="arco"
              d={arcoPath(cx, cy, r, p.inicio, p.fin)}
              fill="none"
              stroke={COLOR_ESTADO[p.estado]}
              strokeWidth={grosor}
              strokeLinecap="round"
            >
              <title>{`${p.nombre}: ${formatearUnidades(p.volumen)} u`}</title>
            </path>
          ))}
        </svg>

        <Variacion porcentaje={variacionTotal} sufijo="vs. mes anterior" />
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-2">
        {productos.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-lg border border-borde bg-tarjeta px-3 py-2 shadow-sm">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_ESTADO[p.estado] }} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-texto">{p.nombre}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-texto-sec">{formatearUnidades(p.volumen)} u</span>
            <Estado estado={p.estado} />
          </li>
        ))}
      </ul>
    </div>
  )
}
