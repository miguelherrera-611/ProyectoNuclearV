import { useEffect, useRef } from 'react'
import { formatearUnidades } from '../format'
import { COLORES_TEXTO } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

const COLOR_ESTADO = { en_meta: '#32b77a', revisar: '#f0a43a' }

// RF-39: la señal de rastreo fuera de ±4 indica que el modelo perdió validez
// (mismo límite que Dashboard.jsx).
const LIMITE_SENAL = 4

// Plano en vez de tabla: eje vertical es la señal de rastreo (con la "zona
// segura" ±4 sombreada), eje horizontal es cuánto varió la demanda este mes,
// el tamaño de la burbuja es el volumen. Lo que hay que revisar literalmente
// se sale de la franja, en vez de tener que leer una columna de números.
//
// productos: [{ id, nombre, volumen, senal, variacion, estado }]
export default function MapaDeRiesgo({ productos }) {
  const { tema } = useTema()
  const texto = COLORES_TEXTO[tema]
  const svgRef = useRef(null)

  const w = 640
  const h = 340
  const margen = { top: 24, right: 24, bottom: 46, left: 58 }
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
  const radio = (vol) => 9 + Math.sqrt(Math.max(vol, 0)) * 0.75

  useEffect(() => {
    const prefiereReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodos = svgRef.current?.querySelectorAll('.burbuja') ?? []
    nodos.forEach((el, i) => {
      if (prefiereReducido) return
      el.style.opacity = '0'
      el.style.transition = `opacity 0.5s ease ${150 + i * 90}ms`
      requestAnimationFrame(() => {
        el.style.opacity = '1'
      })
    })
  }, [productos])

  const ticksX = [-15, -10, -5, 0, 5, 10, 15]
  const ticksY = [-8, -LIMITE_SENAL, 0, LIMITE_SENAL, 8]

  return (
    <figure aria-label="Señal de rastreo vs. variación mensual de cada producto">
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ overflow: 'visible' }}>
        {/* Zona segura: señal entre -4 y 4. */}
        <rect
          x={margen.left}
          y={yPix(LIMITE_SENAL)}
          width={areaW}
          height={yPix(-LIMITE_SENAL) - yPix(LIMITE_SENAL)}
          fill="#32b77a"
          opacity={0.08}
        />
        <text x={margen.left + 8} y={yPix(LIMITE_SENAL) + 16} fontSize="11" fontWeight="700" fill={texto.secundario} opacity={0.8}>
          ZONA SEGURA (±{LIMITE_SENAL})
        </text>

        <line x1={margen.left} y1={yPix(0)} x2={w - margen.right} y2={yPix(0)} stroke={texto.texto} opacity={0.15} />
        <line x1={xPix(0)} y1={margen.top} x2={xPix(0)} y2={h - margen.bottom} stroke={texto.texto} opacity={0.15} />

        {ticksX.map((v) => (
          <text key={v} x={xPix(v)} y={h - margen.bottom + 20} fontSize="10.5" fill={texto.secundario} textAnchor="middle">
            {v}%
          </text>
        ))}
        <text x={w / 2} y={h - 6} fontSize="11" fontWeight="700" fill={texto.secundario} textAnchor="middle">
          VARIACIÓN VS. MES ANTERIOR
        </text>

        {ticksY.map((v) => (
          <text key={v} x={margen.left - 10} y={yPix(v) + 4} fontSize="10.5" fill={texto.secundario} textAnchor="end">
            {v}
          </text>
        ))}
        <text
          x={16}
          y={margen.top}
          fontSize="11"
          fontWeight="700"
          fill={texto.secundario}
          textAnchor="start"
          transform={`rotate(-90 16 ${margen.top})`}
        >
          SEÑAL DE RASTREO
        </text>

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
              <circle cx={x} cy={y} r={r} fill={color} opacity={0.28} stroke={color} strokeWidth={2} />
              <circle cx={x} cy={y} r={3} fill={color} />
              <text x={x} y={y - r - 8} fontSize="11" fontWeight="600" fill={texto.texto} textAnchor="middle">
                {p.nombre}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
