import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatearNumero, formatearPeriodo } from '../format'

export default function ObservacionesPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const esAdministrador = user?.role === 'administrador'

  const [observaciones, setObservaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mes, setMes] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cargar() {
    setCargando(true)
    try {
      const data = await api.observaciones.listar(token, id)
      setObservaciones(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleCapturar(event) {
    event.preventDefault()
    setErrorForm('')

    if (!mes || cantidad === '') {
      setErrorForm('Completa el mes y la cantidad.')
      return
    }

    setEnviando(true)
    try {
      // El input type="month" da "2024-01" — el backend espera una fecha completa.
      await api.observaciones.capturar(token, {
        producto_id: id,
        periodo: `${mes}-01`,
        cantidad: Number(cantidad),
      })
      setMes('')
      setCantidad('')
      await cargar()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleEliminar(observacionId) {
    try {
      await api.observaciones.eliminar(token, observacionId)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <Link to="/productos" className="mb-4 inline-block text-sm text-slate-500 hover:underline">
        ← Volver a productos
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Datos históricos</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {esAdministrador && (
        <form
          onSubmit={handleCapturar}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mes">
              Mes
            </label>
            <input
              id="mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="cantidad">
              Demanda (unidades)
            </label>
            <input
              id="cantidad"
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Guardando...' : 'Capturar'}
          </button>
          {errorForm && <p className="w-full text-sm text-red-600">{errorForm}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Demanda</th>
              {esAdministrador && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={3}>
                  Cargando...
                </td>
              </tr>
            )}

            {!cargando && observaciones.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={3}>
                  Todavía no hay periodos capturados para este producto.
                </td>
              </tr>
            )}

            {observaciones.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-700 capitalize">{formatearPeriodo(o.periodo)}</td>
                <td className="px-4 py-3 text-slate-700">{formatearNumero(o.cantidad, 0)}</td>
                {esAdministrador && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleEliminar(o.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        to={`/pronostico?producto=${id}`}
        className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Calcular pronóstico con estos datos →
      </Link>
    </div>
  )
}
