import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatearUnidades } from '../format'
import { COLOR_EJE, COLORES_TEXTO } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

function useEsAncho() {
  const consulta = '(min-width: 640px)'
  const [esAncho, setEsAncho] = useState(() => window.matchMedia(consulta).matches)

  useEffect(() => {
    const media = window.matchMedia(consulta)
    const cambiar = () => setEsAncho(media.matches)
    media.addEventListener('change', cambiar)
    return () => media.removeEventListener('change', cambiar)
  }, [])

  return esAncho
}

// Gráfico de líneas según la guía de identidad (sección 5):
// - ejes y rejilla en Gris Acero, finos y solo horizontales;
// - eje vertical desde 0 u, con la unidad en cada número;
// - líneas de 2–3 px con puntos circulares del mismo color, leyenda arriba
//   y centrada;
// - el nombre de cada serie al final de su línea (en pantallas anchas) y el
//   valor al pasar el cursor, para no depender solo del color;
// - todo plano: sin sombras, sin degradados, sin 3D.
//
// series: [{ clave, nombre, etiqueta, color, discontinua }]
export default function GraficoLineas({ datos, series, descripcion }) {
  const { tema } = useTema()
  const esAncho = useEsAncho()
  const texto = COLORES_TEXTO[tema]

  const ultimoIndice = (clave) => {
    for (let i = datos.length - 1; i >= 0; i--) {
      if (datos[i][clave] !== null && datos[i][clave] !== undefined) return i
    }
    return -1
  }

  return (
    <figure className="w-full" aria-label={descripcion}>
      {/* Leyenda arriba y centrada. HTML propio en vez de la de Recharts:
          se acomoda en varias líneas en el celular y no deja huecos. El
          texto va en color de texto; la identidad la da la muestra. */}
      <ul className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-texto">
        {series.map((s) => (
          <li key={s.clave} className="flex items-center gap-2">
            <svg width="28" height="10" aria-hidden="true" className="shrink-0">
              <line
                x1="0"
                y1="5"
                x2="28"
                y2="5"
                stroke={s.color}
                strokeWidth="2.5"
                strokeDasharray={s.discontinua ? '6 4' : undefined}
              />
              <circle cx="14" cy="5" r="3.5" fill={s.discontinua ? texto.tarjeta : s.color} stroke={s.color} strokeWidth="2" />
            </svg>
            {s.nombre}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full sm:h-72 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: esAncho ? 120 : 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={COLOR_EJE} strokeWidth={0.5} vertical={false} />
            <XAxis
              dataKey="periodo"
              tick={{ fill: texto.secundario, fontSize: 12, fontFamily: 'Inter' }}
              axisLine={{ stroke: COLOR_EJE }}
              tickLine={{ stroke: COLOR_EJE }}
              interval="preserveStartEnd"
              minTickGap={esAncho ? 24 : 12}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={(v) => formatearUnidades(v)}
              tick={{ fill: texto.secundario, fontSize: esAncho ? 12 : 11, fontFamily: 'Inter' }}
              axisLine={{ stroke: COLOR_EJE }}
              tickLine={{ stroke: COLOR_EJE }}
              width={esAncho ? 84 : 72}
            />
            <Tooltip
              formatter={(valor, nombre) => [formatearUnidades(valor), nombre]}
              contentStyle={{
                background: texto.tarjeta,
                border: `1px solid ${texto.borde}`,
                borderRadius: 0,
                boxShadow: 'none',
                color: texto.texto,
                fontFamily: 'Inter',
                fontSize: 13,
              }}
              labelStyle={{ color: texto.texto, fontWeight: 700 }}
              cursor={{ stroke: COLOR_EJE, strokeWidth: 1 }}
            />
            {series.map((s) => {
              const fin = ultimoIndice(s.clave)
              return (
                <Line
                  key={s.clave}
                  type="linear"
                  dataKey={s.clave}
                  name={s.nombre}
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeDasharray={s.discontinua ? '6 4' : undefined}
                  dot={{ r: 3.5, fill: s.discontinua ? texto.tarjeta : s.color, stroke: s.color, strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: s.color, stroke: texto.tarjeta, strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                  label={
                    esAncho
                      ? ({ x, y, index }) =>
                          index === fin ? (
                            <text
                              key={`etiqueta-${s.clave}`}
                              x={x + 10}
                              y={y}
                              dy={4}
                              fill={texto.texto}
                              fontSize={12}
                              fontFamily="Inter"
                              fontWeight={500}
                            >
                              {s.etiqueta ?? s.nombre}
                            </text>
                          ) : null
                      : false
                  }
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
