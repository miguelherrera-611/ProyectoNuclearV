import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import GraficoLineas from '../components/GraficoLineas'
import { EncabezadoReporte, PieReporte } from '../components/Reporte'
import { Aviso, BarraCarga, Boton, Estado, Fila, Kpi, Tabla, Tarjeta, Td, Th, Titulo, Variacion } from '../components/ui'
import { formatearNumero, formatearPeriodo, formatearUnidades } from '../format'
import { colorDeProducto } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

// Cada método con los parámetros por defecto de la pantalla de pronóstico.
// El dashboard muestra, por producto, el de menor MAD: todavía no existe el
// "método oficial" por producto (RF-32).
const METODOS = [
  { metodo: 'promedio_movil_simple', nombre: 'Promedio móvil simple', parametros: { n: 2 } },
  { metodo: 'promedio_movil_ponderado', nombre: 'Promedio móvil ponderado', parametros: { pesos: [0.4, 0.6] } },
  { metodo: 'suavizamiento_exponencial', nombre: 'Suavizamiento exponencial', parametros: { alpha: 0.45 } },
  { metodo: 'suavizacion_exponencial_tendencia', nombre: 'Holt', parametros: { alpha: 0.5, beta: 0.5 } },
  { metodo: 'regresion_lineal', nombre: 'Regresión lineal', parametros: {} },
]

// RF-39: la señal de rastreo fuera de ±4 indica que el modelo perdió validez.
const LIMITE_SENAL = 4
const MESES_GRAFICO = 24

async function mejorPronostico(token, productoId) {
  const resultados = await Promise.all(
    METODOS.map((m) =>
      api.pronosticos
        .calcular(token, { producto_id: productoId, metodo: m.metodo, ...m.parametros })
        .then((r) => ({ ...m, resultado: r }))
        .catch(() => null),
    ),
  )

  return resultados
    .filter((r) => r && r.resultado.metricas.mad !== null)
    .sort((a, b) => a.resultado.metricas.mad - b.resultado.metricas.mad)[0]
}

export default function Dashboard() {
  const { token, user } = useAuth()
  const { tema, imprimirReporte } = useTema()

  const [productos, setProductos] = useState([])
  const [resumen, setResumen] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true

    async function cargar() {
      try {
        const lista = await api.productos.listar(token)
        const activos = lista.filter((p) => p.activo)
        const mejores = await Promise.all(activos.map((p) => mejorPronostico(token, p.id)))

        if (!vigente) return
        setProductos(lista)
        setResumen(activos.map((p, i) => ({ producto: p, mejor: mejores[i] })).filter((r) => r.mejor))
      } catch (err) {
        if (vigente) setError(err.message)
      } finally {
        if (vigente) setCargando(false)
      }
    }

    cargar()
    return () => {
      vigente = false
    }
  }, [token])

  const filasTabla = resumen.map(({ producto, mejor }) => {
    const filas = mejor.resultado.filas
    const siguiente = filas.at(-1)
    const ultimoReal = filas.findLast((f) => f.real !== null)
    const senal = mejor.resultado.metricas.senal_rastreo
    return {
      producto,
      metodo: mejor.nombre,
      periodo: siguiente.periodo,
      pronostico: siguiente.pronostico,
      ultimoReal: ultimoReal?.real ?? null,
      mad: mejor.resultado.metricas.mad,
      estado: senal !== null && Math.abs(senal) <= LIMITE_SENAL ? 'en_meta' : 'revisar',
    }
  })

  const totalProyectado = filasTabla.reduce((suma, f) => suma + (f.pronostico ?? 0), 0)
  const totalUltimoReal = filasTabla.reduce((suma, f) => suma + (f.ultimoReal ?? 0), 0)
  const variacion = totalUltimoReal > 0 ? ((totalProyectado - totalUltimoReal) / totalUltimoReal) * 100 : null
  const enMeta = filasTabla.filter((f) => f.estado === 'en_meta').length
  const mesesHistorico = Math.max(0, ...resumen.map(({ mejor }) => mejor.resultado.filas.filter((f) => f.real !== null).length))

  // Una fila por mes con la demanda real de cada producto (últimos 24 meses).
  const porPeriodo = new Map()
  resumen.forEach(({ producto, mejor }) => {
    mejor.resultado.filas
      .filter((f) => f.real !== null)
      .forEach((f) => {
        const fila = porPeriodo.get(f.periodo) ?? { iso: f.periodo }
        fila[`p${producto.id}`] = f.real
        porPeriodo.set(f.periodo, fila)
      })
  })
  const datosGrafico = [...porPeriodo.values()]
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .slice(-MESES_GRAFICO)
    .map(({ iso, ...resto }) => ({ periodo: formatearPeriodo(iso), ...resto }))

  const series = resumen.map(({ producto }) => ({
    clave: `p${producto.id}`,
    nombre: producto.nombre,
    etiqueta: producto.nombre.split(' ').slice(0, 2).join(' '),
    color: colorDeProducto(productos, producto.id, tema),
  }))

  return (
    <div>
      <EncabezadoReporte subtitulo="Todos los productos · Próximo mes" />

      <div className="print:hidden">
        <Titulo
          subtitulo={
            <>
              Hola, {user?.name} · <span className="capitalize">{user?.role}</span>
            </>
          }
          acciones={
            <>
              <Link
                to="/pronostico"
                className="inline-flex min-h-11 items-center justify-center bg-principal px-5 py-2 font-display text-sm font-bold text-sobre-principal hover:bg-principal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                Generar pronóstico
              </Link>
              <Boton variante="secundario" onClick={imprimirReporte} disabled={cargando || resumen.length === 0}>
                Exportar reporte
              </Boton>
            </>
          }
        >
          Panel de pronóstico
        </Titulo>
      </div>

      {error && <Aviso className="mb-6">{error}</Aviso>}
      {cargando && <BarraCarga etiqueta="Calculando el pronóstico de cada producto…" />}

      {!cargando && !error && resumen.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">
          Todavía no hay productos con datos suficientes para pronosticar.{' '}
          <Link to="/productos" className="font-medium text-texto underline underline-offset-4">
            Ir a productos
          </Link>
        </Tarjeta>
      )}

      {!cargando && resumen.length > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi etiqueta="Unidades proyectadas" valor={formatearUnidades(totalProyectado)}>
              <Variacion porcentaje={variacion} sufijo="vs. último mes real" />
            </Kpi>
            <Kpi etiqueta="Productos en meta" valor={`${enMeta} de ${filasTabla.length}`}>
              <p className="mt-3 text-sm text-texto-sec">Señal de rastreo dentro de ±{LIMITE_SENAL}</p>
            </Kpi>
            <Kpi etiqueta="Meses de histórico" valor={mesesHistorico}>
              <p className="mt-3 text-sm text-texto-sec">Base del cálculo de cada método</p>
            </Kpi>
          </div>

          <Tarjeta className="mb-6 p-3 sm:p-6">
            <h2 className="mb-1 px-1 font-display text-lg font-bold">Demanda de los últimos {MESES_GRAFICO} meses</h2>
            <p className="mb-4 px-1 text-sm text-texto-sec">Unidades vendidas por mes y producto</p>
            <GraficoLineas
              descripcion={`Demanda mensual de los últimos ${MESES_GRAFICO} meses por producto`}
              datos={datosGrafico}
              series={series}
            />
          </Tarjeta>

          <h2 className="mb-3 font-display text-lg font-bold">Pronóstico del próximo mes</h2>

          {/* Celular: una tarjeta por producto, con las mismas 4 columnas. */}
          <ul className="grid gap-3 sm:hidden print:hidden">
            {filasTabla.map((f) => (
              <li key={f.producto.id}>
                <Tarjeta className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block size-3 shrink-0"
                      style={{ backgroundColor: colorDeProducto(productos, f.producto.id, tema) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{f.producto.nombre}</p>
                      <p className="text-xs text-texto-sec">
                        {f.metodo} · MAD {formatearNumero(f.mad)}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-texto-sec">Mes</dt>
                      <dd className="mt-1">{formatearPeriodo(f.periodo)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs font-bold uppercase tracking-wide text-texto-sec">Pronóstico</dt>
                      <dd className="mt-1 font-display text-lg font-bold text-principal">{formatearUnidades(f.pronostico)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <Estado estado={f.estado} />
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block print:block">
            <Tabla etiqueta="Pronóstico del próximo mes por producto">
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Mes</Th>
                  <Th numero>Pronóstico</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((f) => (
                  <Fila key={f.producto.id}>
                    <Td>
                      <span className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 inline-block size-3 shrink-0"
                          style={{ backgroundColor: colorDeProducto(productos, f.producto.id, tema) }}
                        />
                        <span className="min-w-40">
                          <span className="block font-medium">{f.producto.nombre}</span>
                          <span className="block text-xs text-texto-sec">
                            {f.metodo} · MAD {formatearNumero(f.mad)}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{formatearPeriodo(f.periodo)}</Td>
                    <Td numero>{formatearUnidades(f.pronostico)}</Td>
                    <Td>
                      <Estado estado={f.estado} />
                    </Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
          <p className="mt-3 text-xs text-texto-sec">
            Por producto se muestra el método con menor MAD entre los 4 disponibles, con sus parámetros por defecto.
          </p>
        </>
      )}

      <PieReporte />
    </div>
  )
}
