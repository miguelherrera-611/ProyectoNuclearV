import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import GraficoLineas from '../components/GraficoLineas'
import { EncabezadoReporte, PieReporte } from '../components/Reporte'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Kpi, Selector, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { formatearNumero, formatearPeriodo, formatearPorcentaje, formatearUnidades } from '../format'
import { colorDeProducto } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

const METODOS = {
  promedio_movil_simple: 'Promedio móvil simple',
  promedio_movil_ponderado: 'Promedio móvil ponderado',
  suavizamiento_exponencial: 'Suavizamiento exponencial',
  suavizacion_exponencial_tendencia: 'Suavización exponencial con tendencia (Holt)',
}

export default function PronosticoPage() {
  const { token } = useAuth()
  const { tema, imprimirReporte } = useTema()
  const [searchParams] = useSearchParams()

  const [productos, setProductos] = useState([])
  const [productoId, setProductoId] = useState(searchParams.get('producto') ?? '')
  const [metodo, setMetodo] = useState('promedio_movil_simple')
  const [n, setN] = useState(2)
  // Valores por defecto = los del Excel de ejemplo del cliente.
  const [pesos, setPesos] = useState(['0.4', '0.6'])
  const [alpha, setAlpha] = useState('0.45')
  const [pronosticoInicial, setPronosticoInicial] = useState('')
  // Holt lleva su propio α para no pisar el del suavizamiento simple.
  const [alphaHolt, setAlphaHolt] = useState(0.5)
  const [beta, setBeta] = useState(0.5)
  const [resultado, setResultado] = useState(null)
  // Producto y método del resultado mostrado (no los del formulario, que el
  // usuario puede cambiar después de calcular).
  const [calculado, setCalculado] = useState(null)
  const [error, setError] = useState('')
  const [calculando, setCalculando] = useState(false)

  useEffect(() => {
    api.productos
      .listar(token)
      .then(setProductos)
      .catch((err) => setError(err.message))
  }, [token])

  async function handleCalcular(event) {
    event.preventDefault()
    setError('')
    setResultado(null)

    if (!productoId) {
      setError('Elige un producto.')
      return
    }

    const parametros = {
      promedio_movil_simple: { n: Number(n) },
      promedio_movil_ponderado: { pesos: pesos.map(Number) },
      suavizamiento_exponencial: {
        alpha: Number(alpha),
        pronostico_inicial: pronosticoInicial === '' ? null : Number(pronosticoInicial),
      },
      suavizacion_exponencial_tendencia: { alpha: Number(alphaHolt), beta: Number(beta) },
    }[metodo]

    setCalculando(true)
    try {
      const data = await api.pronosticos.calcular(token, { producto_id: productoId, metodo, ...parametros })
      setResultado(data)
      setCalculado({ productoId, metodo })
    } catch (err) {
      setError(err.message)
    } finally {
      setCalculando(false)
    }
  }

  // Cambiar n en el ponderado agrega o quita pesos, conservando los que ya había.
  function cambiarCantidadDePesos(valor) {
    const cantidad = Math.max(2, Number(valor) || 2)
    setPesos((actuales) => Array.from({ length: cantidad }, (_, i) => actuales[i] ?? '0'))
  }

  const sumaPesos = pesos.reduce((suma, p) => suma + (Number(p) || 0), 0)
  const pesosSumanUno = Math.abs(sumaPesos - 1) <= 0.0001

  const productoCalculado = productos.find((p) => String(p.id) === String(calculado?.productoId))
  const colorProducto = calculado ? colorDeProducto(productos, calculado.productoId, tema) : null
  const siguiente = resultado?.filas.at(-1)

  const datosGrafico = resultado?.filas.map((f) => ({
    periodo: formatearPeriodo(f.periodo),
    real: f.real,
    pronostico: f.pronostico,
  }))

  return (
    <div>
      <EncabezadoReporte
        subtitulo={
          resultado && productoCalculado
            ? `${productoCalculado.nombre} · ${METODOS[calculado.metodo]} · Horizonte 1 mes`
            : null
        }
      />

      <div className="print:hidden">
        <Titulo
          subtitulo="Elige un producto y un método para comparar la demanda real con el pronóstico."
          acciones={
            resultado && (
              <Boton variante="secundario" onClick={imprimirReporte}>
                Exportar reporte
              </Boton>
            )
          }
        >
          Pronóstico
        </Titulo>

        <Tarjeta className="mb-6 p-4 sm:p-6">
          <form onSubmit={handleCalcular}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo id="producto" etiqueta="Producto" className="sm:col-span-2 lg:col-span-2">
                <Selector id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Selector>
              </Campo>

              <Campo id="metodo" etiqueta="Método" className="sm:col-span-2 lg:col-span-2">
                <Selector
                  id="metodo"
                  value={metodo}
                  onChange={(e) => {
                    setMetodo(e.target.value)
                    setResultado(null)
                  }}
                >
                  {Object.entries(METODOS).map(([clave, nombre]) => (
                    <option key={clave} value={clave}>
                      {nombre}
                    </option>
                  ))}
                </Selector>
              </Campo>

              {metodo === 'promedio_movil_simple' && (
                <Campo id="n" etiqueta="n (periodos)">
                  <Entrada id="n" type="number" min="2" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
                </Campo>
              )}

              {metodo === 'promedio_movil_ponderado' && (
                <>
                  <Campo id="n-pesos" etiqueta="n (periodos)">
                    <Entrada
                      id="n-pesos"
                      type="number"
                      min="2"
                      inputMode="numeric"
                      value={pesos.length}
                      onChange={(e) => cambiarCantidadDePesos(e.target.value)}
                    />
                  </Campo>
                  {pesos.map((peso, i) => (
                    <Campo key={i} id={`peso-${i}`} etiqueta={`w${i + 1} ${i === 0 ? '(más reciente)' : `(t−${i + 1})`}`}>
                      <Entrada
                        id={`peso-${i}`}
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        inputMode="decimal"
                        value={peso}
                        onChange={(e) => setPesos((actuales) => actuales.map((p, j) => (j === i ? e.target.value : p)))}
                      />
                    </Campo>
                  ))}
                  <div className="sm:col-span-2 lg:col-span-4">
                    {pesosSumanUno ? (
                      <p className="text-sm text-texto-sec">Suma de los pesos: {formatearNumero(sumaPesos)}</p>
                    ) : (
                      <Aviso tipo="alerta">Los pesos suman {formatearNumero(sumaPesos)} y deben sumar 1.</Aviso>
                    )}
                  </div>
                </>
              )}

              {metodo === 'suavizamiento_exponencial' && (
                <>
                  <Campo id="alpha" etiqueta="α (0–1)">
                    <Entrada
                      id="alpha"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      inputMode="decimal"
                      value={alpha}
                      onChange={(e) => setAlpha(e.target.value)}
                    />
                  </Campo>
                  <Campo id="pronostico-inicial" etiqueta="Pronóstico inicial (u)" ayuda="Vacío = primer dato real">
                    <Entrada
                      id="pronostico-inicial"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={pronosticoInicial}
                      onChange={(e) => setPronosticoInicial(e.target.value)}
                    />
                  </Campo>
                </>
              )}

              {metodo === 'suavizacion_exponencial_tendencia' && (
                <>
                  <Campo id="alpha-holt" etiqueta="α (nivel)">
                    <Entrada
                      id="alpha-holt"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      inputMode="decimal"
                      value={alphaHolt}
                      onChange={(e) => setAlphaHolt(e.target.value)}
                    />
                  </Campo>
                  <Campo id="beta" etiqueta="β (tendencia)">
                    <Entrada
                      id="beta"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      inputMode="decimal"
                      value={beta}
                      onChange={(e) => setBeta(e.target.value)}
                    />
                  </Campo>
                </>
              )}
            </div>

            <Boton type="submit" disabled={calculando} className="mt-6 w-full sm:w-auto">
              {calculando ? 'Calculando…' : 'Calcular pronóstico'}
            </Boton>
            {calculando && <BarraCarga etiqueta="Calculando…" />}
          </form>
        </Tarjeta>

        {error && <Aviso className="mb-6">{error}</Aviso>}
      </div>

      {resultado && (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Kpi etiqueta="Unidades proyectadas" valor={formatearUnidades(siguiente?.pronostico)}>
              <p className="mt-3 text-sm text-texto-sec">{siguiente && formatearPeriodo(siguiente.periodo)}</p>
            </Kpi>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
              <Kpi compacto etiqueta="MAD" valor={formatearUnidades(resultado.metricas.mad, 2)} />
              <Kpi compacto etiqueta="MSE" valor={formatearNumero(resultado.metricas.mse)} />
              <Kpi compacto etiqueta="MAPE" valor={formatearPorcentaje(resultado.metricas.mape)} />
              <Kpi compacto etiqueta="RSFE" valor={formatearUnidades(resultado.metricas.rsfe, 2)} />
              <Kpi compacto etiqueta="Señal de rastreo" valor={formatearNumero(resultado.metricas.senal_rastreo)} />
              <Kpi compacto etiqueta="Periodos evaluados" valor={resultado.metricas.n_periodos_evaluados} />
            </div>
          </div>

          <Tarjeta className="mb-6 p-3 sm:p-6">
            <h2 className="mb-1 px-1 font-display text-lg font-bold">Demanda real vs. pronóstico</h2>
            <p className="mb-4 px-1 text-sm text-texto-sec">
              {productoCalculado?.nombre} · {METODOS[calculado.metodo]}
            </p>
            <GraficoLineas
              descripcion={`Demanda real y pronóstico de ${productoCalculado?.nombre ?? 'el producto'}`}
              datos={datosGrafico}
              series={[
                { clave: 'real', nombre: 'Demanda real', etiqueta: 'Real', color: colorProducto },
                { clave: 'pronostico', nombre: 'Pronóstico', etiqueta: 'Pronóstico', color: colorProducto, discontinua: true },
              ]}
            />
          </Tarjeta>

          <Tabla etiqueta="Detalle del pronóstico por periodo">
            <thead>
              <tr>
                <Th>Periodo</Th>
                <Th numero>D</Th>
                <Th numero>F</Th>
                <Th numero>E</Th>
                <Th numero>|E|</Th>
                <Th numero>E²</Th>
                <Th numero>|E|/D</Th>
              </tr>
            </thead>
            <tbody>
              {resultado.filas.map((f, i) => (
                <Fila key={i}>
                  <Td className="whitespace-nowrap">{formatearPeriodo(f.periodo)}</Td>
                  <Td numero>{formatearUnidades(f.real)}</Td>
                  <Td numero>{formatearUnidades(f.pronostico, 2)}</Td>
                  <Td numero>{formatearUnidades(f.error, 2)}</Td>
                  <Td numero>{formatearUnidades(f.error_abs, 2)}</Td>
                  <Td numero>{formatearNumero(f.error_cuadrado)}</Td>
                  <Td numero>{formatearPorcentaje(f.error_relativo !== null ? f.error_relativo * 100 : null)}</Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        </>
      )}

      <PieReporte />
    </div>
  )
}
