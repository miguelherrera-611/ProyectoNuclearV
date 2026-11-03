import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatearNumero, formatearPeriodo, formatearPorcentaje } from '../format'

// Colores de la paleta categórica validada (ver skill dataviz): slot 1 azul
// para la demanda real, slot 2 naranja para el pronóstico — el par con
// mejor separación (CVD y visión normal) entre los disponibles.
const COLOR_REAL = '#2a78d6'
const COLOR_PRONOSTICO = '#eb6834'

export default function PronosticoPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()

  const [productos, setProductos] = useState([])
  const [productoId, setProductoId] = useState(searchParams.get('producto') ?? '')
  const [n, setN] = useState(2)
  const [resultado, setResultado] = useState(null)
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

    setCalculando(true)
    try {
      const data = await api.pronosticos.calcular(token, { producto_id: productoId, n: Number(n) })
      setResultado(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCalculando(false)
    }
  }

  const datosGrafico = resultado?.filas.map((f) => ({
    periodo: formatearPeriodo(f.periodo),
    real: f.real,
    pronostico: f.pronostico,
  }))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Pronóstico — Promedio móvil simple</h1>

      <form
        onSubmit={handleCalcular}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="producto">
            Producto
          </label>
          <select
            id="producto"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Selecciona...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="n">
            n (periodos)
          </label>
          <input
            id="n"
            type="number"
            min="2"
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={calculando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {calculando ? 'Calculando...' : 'Calcular'}
        </button>
      </form>

      {error && <p className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {resultado && (
        <>
          <div className="mb-6 h-80 rounded-xl border border-slate-200 bg-white p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico}>
                <CartesianGrid stroke="#e1e0d9" strokeWidth={1} vertical={false} />
                <XAxis dataKey="periodo" tick={{ fill: '#898781', fontSize: 12 }} axisLine={{ stroke: '#c3c2b7' }} />
                <YAxis tick={{ fill: '#898781', fontSize: 12 }} axisLine={{ stroke: '#c3c2b7' }} />
                <Tooltip contentStyle={{ fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line
                  type="monotone"
                  dataKey="real"
                  name="Demanda real"
                  stroke={COLOR_REAL}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLOR_REAL }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="pronostico"
                  name="Pronóstico"
                  stroke={COLOR_PRONOSTICO}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLOR_PRONOSTICO }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Metrica label="MAD" valor={formatearNumero(resultado.metricas.mad)} />
            <Metrica label="MSE" valor={formatearNumero(resultado.metricas.mse)} />
            <Metrica label="MAPE" valor={formatearPorcentaje(resultado.metricas.mape)} />
            <Metrica label="RSFE" valor={formatearNumero(resultado.metricas.rsfe)} />
            <Metrica label="Señal de rastreo" valor={formatearNumero(resultado.metricas.senal_rastreo)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Periodo</th>
                  <th className="px-3 py-2 font-medium">D</th>
                  <th className="px-3 py-2 font-medium">F</th>
                  <th className="px-3 py-2 font-medium">E</th>
                  <th className="px-3 py-2 font-medium">|E|</th>
                  <th className="px-3 py-2 font-medium">E²</th>
                  <th className="px-3 py-2 font-medium">|E|/D</th>
                </tr>
              </thead>
              <tbody>
                {resultado.filas.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-700 last:border-0">
                    <td className="px-3 py-2 capitalize">{formatearPeriodo(f.periodo)}</td>
                    <td className="px-3 py-2">{f.real === null ? '/' : formatearNumero(f.real, 0)}</td>
                    <td className="px-3 py-2">{formatearNumero(f.pronostico)}</td>
                    <td className="px-3 py-2">{formatearNumero(f.error)}</td>
                    <td className="px-3 py-2">{formatearNumero(f.error_abs)}</td>
                    <td className="px-3 py-2">{formatearNumero(f.error_cuadrado)}</td>
                    <td className="px-3 py-2">{formatearPorcentaje(f.error_relativo !== null ? f.error_relativo * 100 : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Metrica({ label, valor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{valor}</p>
    </div>
  )
}
