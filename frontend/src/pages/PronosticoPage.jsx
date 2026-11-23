import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import Desplegable from '../components/Desplegable'
import GraficoLineas from '../components/GraficoLineas'
import Paginador from '../components/Paginador'
import ResultadoEstacional from '../components/ResultadoEstacional'
import { EncabezadoReporte, PieReporte } from '../components/Reporte'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Kpi, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'
import { formatearNumero, formatearPeriodo, formatearPorcentaje, formatearUnidades } from '../format'
import { colorDeProducto } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

const METODOS = {
  promedio_movil_simple: 'Promedio móvil simple',
  promedio_movil_ponderado: 'Promedio móvil ponderado',
  suavizamiento_exponencial: 'Suavizamiento exponencial',
  suavizacion_exponencial_tendencia: 'Suavización exponencial con tendencia (Holt)',
  regresion_lineal: 'Regresión lineal',
  estacional_multiplicativo: 'Estacional multiplicativo',
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
  const [periodoCorteEstacional, setPeriodoCorteEstacional] = useState('2026-09')
  const [resultado, setResultado] = useState(null)
  // Producto y método del resultado mostrado (no los del formulario, que el
  // usuario puede cambiar después de calcular).
  const [calculado, setCalculado] = useState(null)
  const [error, setError] = useState('')
  const [calculando, setCalculando] = useState(false)

  const pag = usePaginacion(resultado?.filas.length ?? 0, 10, calculado)

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
      regresion_lineal: {},
      estacional_multiplicativo: { periodo_corte: periodoCorteEstacional || null },
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
            ? `${productoCalculado.nombre} · ${METODOS[calculado.metodo]} · ${resultado.estacional ? `Año ${resultado.estacional.anio_proyectado}` : 'Horizonte 1 mes'}`
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
                <Desplegable
                  id="producto"
                  value={productoId}
                  onChange={setProductoId}
                  opciones={productos.map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))}
                />
              </Campo>

              <Campo id="metodo" etiqueta="Método" className="sm:col-span-2 lg:col-span-2">
                <Desplegable
                  id="metodo"
                  value={metodo}
                  onChange={(valor) => {
                    setMetodo(valor)
                    setResultado(null)
                  }}
                  opciones={Object.entries(METODOS).map(([clave, nombre]) => ({ valor: clave, etiqueta: nombre }))}
                />
              </Campo>

              {metodo === 'promedio_movil_simple' && (
                <Campo
                  id="n"
                  etiqueta="¿Cuántos meses promediar? (n)"
                  ayuda="El pronóstico es el promedio de los últimos n meses de demanda real. Ej.: n=3 promedia los 3 meses más recientes."
                  className="sm:col-span-2 lg:col-span-2"
                >
                  <Entrada id="n" type="number" min="2" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
                </Campo>
              )}

              {metodo === 'estacional_multiplicativo' && (
                <Campo
                  id="periodo-corte-estacional"
                  etiqueta="Último mes completo"
                  ayuda="El Excel de comparación usa septiembre de 2026. Vacío utiliza todos los datos registrados."
                  className="sm:col-span-2 lg:col-span-2"
                >
                  <Entrada
                    id="periodo-corte-estacional"
                    type="month"
                    value={periodoCorteEstacional}
                    onChange={(e) => setPeriodoCorteEstacional(e.target.value)}
                  />
                </Campo>
              )}

              {metodo === 'promedio_movil_ponderado' && (
                <>
                  <Campo
                    id="n-pesos"
                    etiqueta="¿Cuántos meses usar? (n)"
                    ayuda="Por cada mes que elijas aquí abajo te va a pedir un peso."
                    className="sm:col-span-2 lg:col-span-4"
                  >
                    <Entrada
                      id="n-pesos"
                      type="number"
                      min="2"
                      inputMode="numeric"
                      value={pesos.length}
                      onChange={(e) => cambiarCantidadDePesos(e.target.value)}
                    />
                  </Campo>

                  <p className="sm:col-span-2 lg:col-span-4 -mt-2 text-sm text-texto-sec">
                    Reparte qué tanto influye cada uno de esos meses en el pronóstico: al mes que más se parezca a lo que
                    esperas que pase ponle el peso más alto. Entre todos los pesos deben sumar <strong>1</strong> (el 100&nbsp;%).
                  </p>

                  {pesos.map((peso, i) => (
                    <Campo
                      key={i}
                      id={`peso-${i}`}
                      etiqueta={i === 0 ? 'Peso: el mes más reciente' : `Peso: hace ${i + 1} meses`}
                    >
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
                      <p className="text-sm text-texto-sec">Suma de los pesos: {formatearNumero(sumaPesos)} (listo, da 1)</p>
                    ) : (
                      <Aviso tipo="alerta">
                        Los pesos suman {formatearNumero(sumaPesos)} y deben sumar 1 (100&nbsp;%). Ajusta alguno para que
                        cuadre.
                      </Aviso>
                    )}
                  </div>
                </>
              )}

              {metodo === 'suavizamiento_exponencial' && (
                <>
                  <Campo
                    id="alpha"
                    etiqueta="α — qué tanto caso le hace a lo último (0 a 1)"
                    ayuda="Más alto (ej. 0,8) = reacciona rápido a un cambio reciente. Más bajo (ej. 0,2) = pronóstico más estable, ignora más los saltos de un solo mes."
                    className="sm:col-span-2"
                  >
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
                  <Campo
                    id="pronostico-inicial"
                    etiqueta="Pronóstico inicial (u)"
                    ayuda="Con qué número arranca el cálculo del primer mes. Vacío = usa la primera demanda real registrada."
                  >
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
                  <Campo
                    id="alpha-holt"
                    etiqueta="α — nivel: qué tanto caso le hace a lo último (0 a 1)"
                    ayuda="Más alto = el promedio general se ajusta rápido a un cambio reciente en la demanda."
                  >
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
                  <Campo
                    id="beta"
                    etiqueta="β — tendencia: qué tan rápido ajusta si sube o baja (0 a 1)"
                    ayuda="Más alto = si la demanda viene en subida o bajada, el pronóstico se ajusta más rápido a ese cambio de dirección."
                  >
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

      {resultado?.estacional && (
        <ResultadoEstacional resultado={resultado} producto={productoCalculado} colorProducto={colorProducto} />
      )}

      {resultado && !resultado.estacional && (
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

          <Tabla
            etiqueta="Detalle del pronóstico por periodo"
            pie={<Paginador {...pag} onCambiar={pag.setPagina} />}
          >
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
                <Fila key={i} className={pag.claseFila(i)}>
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
