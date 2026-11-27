import { useEffect, useRef } from 'react'
import { formatearUnidades } from '../format'
import { COLORES_TEXTO } from '../tema/colores'
import { useTema } from '../tema/TemaContext'
import { Estado } from './ui'

const COLOR_ESTADO = { en_meta: '#32b77a', revisar: '#f0a43a' }

// RF-39: la señal de rastreo fuera de ±4 indica que el modelo perdió validez
// (mismo límite que Dashboard.jsx).
const LIMITE_SENAL = 4

// El radio es relativo al producto más grande del propio lote (no al volumen
// absoluto) — así con 2 o con 20 productos, y sin importar si venden miles o
// millones de unidades, la burbuja más grande siempre mide lo mismo en
// pantalla. Antes salía proporcional a la raíz del volumen sin tope: con
// pocos productos de mucho volumen, las burbujas se volvían enormes y se
// encimaban.
const RADIO_MIN = 7
const RADIO_MAX = 20

// Plano en vez de tabla: eje vertical es la señal de rastreo (con la "zona
// segura" ±4 sombreada), eje horizontal es cuánto varió la demanda este mes.
// Los nombres van en una leyenda debajo, no encima del punto — con puntos
// cercanos, el texto sobrepuesto se volvía ilegible.
//
// productos: [{ id, nombre, volumen, senal, variacion, estado }]
export default function MapaDeRiesgo({ productos }) {
  const { tema } = useTema()
  const texto = COLORES_TEXTO[tema]
  const svgRef = useRef(null)

  const w = 560
  const h = 240
  const margen = { top: 16, right: 20, bottom: 32, left: 40 }
  const areaW = w - margen.left - margen.right
  const areaH = h - margen.top - margen.bottom

  // Escala fija (cubre holgadamente los rangos típicos de esta app); un
  // producto con un valor más extremo se recorta al borde en vez de romper
  // el dibujo.
  const xMax = 16
  const yMax = 8

  const clamp = (v, max) => Math.max(-max, Math.min(max, v))
  const xPix = (v) => margen.left + ((clamp(v, xMax) + xMax) / (xMax * 2)) * areaW
  const yPix = (v) => margen.top + ((yMax - clamp(v, yMax)) / (yMax * 2)) * areaH

  const volumenMaximo = Math.max(...productos.map((p) => p.volumen), 1)
  const radio = (vol) => RADIO_MIN + (RADIO_MAX - RADIO_MIN) * Math.sqrt(Math.max(vol, 0) / volumenMaximo)

  useEffect(() => {
    const prefiereReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodos = svgRef.current?.querySelectorAll('.burbuja') ?? []
    nodos.forEach((el, i) => {
      if (prefiereReducido) return
      el.style.opacity = '0'
      el.style.transition = `opacity 0.5s ease ${150 + i * 80}ms`
      requestAnimationFrame(() => {
        el.style.opacity = '1'
      })
    })
  }, [productos])

  const ticksX = [-15, -5, 5, 15]
  const ticksY = [-8, -LIMITE_SENAL, LIMITE_SENAL, 8]

  return (
    <div>
      <figure aria-label="Señal de rastreo vs. variación mensual de cada producto">
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full">
          {/* Zona segura: señal entre -4 y 4. */}
          <rect
            x={margen.left}
            y={yPix(LIMITE_SENAL)}
            width={areaW}
            height={yPix(-LIMITE_SENAL) - yPix(LIMITE_SENAL)}
            fill="#32b77a"
            opacity={0.08}
          />
          <text x={margen.left + 6} y={yPix(LIMITE_SENAL) + 13} fontSize="9.5" fontWeight="700" fill={texto.secundario} opacity={0.8}>
            ZONA SEGURA
          </text>

          <line x1={margen.left} y1={yPix(0)} x2={w - margen.right} y2={yPix(0)} stroke={texto.texto} opacity={0.15} />
          <line x1={xPix(0)} y1={margen.top} x2={xPix(0)} y2={h - margen.bottom} stroke={texto.texto} opacity={0.15} />

          {ticksX.map((v) => (
            <text key={v} x={xPix(v)} y={h - margen.bottom + 16} fontSize="9.5" fill={texto.secundario} textAnchor="middle">
              {v}%
            </text>
          ))}
          {ticksY.map((v) => (
            <text key={v} x={margen.left - 6} y={yPix(v) + 3} fontSize="9.5" fill={texto.secundario} textAnchor="end">
              {v}
            </text>
          ))}

          {productos.map((p) => {
            const x = xPix(p.variacion ?? 0)
            const y = yPix(p.senal ?? 0)
            const r = radio(p.volumen)
            const color = COLOR_ESTADO[p.estado]
            return (
              <g key={p.id} className="burbuja">
                <title>
                  {`${p.nombre}: ${formatearUnidades(p.volumen)} u · señal ${p.senal > 0 ? '+' : ''}${p.senal?.toFixed(1)} · variación ${
                    p.variacion > 0 ? '+' : ''
                  }${p.variacion?.toFixed(1)}%`}
                </title>
                <circle cx={x} cy={y} r={r} fill={color} opacity={0.3} stroke={color} strokeWidth={1.5} />
                <circle cx={x} cy={y} r={2.5} fill={color} />
              </g>
            )
          })}
        </svg>
      </figure>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {productos.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLOR_ESTADO[p.estado] }} />
            <span className="font-medium text-texto">{p.nombre}</span>
            <span className="text-texto-sec">
              señal {p.senal > 0 ? '+' : ''}
              {p.senal?.toFixed(1)}
            </span>
            <Estado estado={p.estado} />
          </li>
        ))}
      </ul>
    </div>
  )
}
