import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function ProductosPage() {
  const { token, user } = useAuth()
  const esAdministrador = user?.role === 'administrador'

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cargarProductos() {
    setCargando(true)
    try {
      const data = await api.productos.listar(token)
      setProductos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCrear(event) {
    event.preventDefault()
    setErrorForm('')

    if (!codigo || !nombre) {
      setErrorForm('Completa código y nombre.')
      return
    }

    setEnviando(true)
    try {
      await api.productos.crear(token, { codigo, nombre })
      setCodigo('')
      setNombre('')
      await cargarProductos()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleDarDeBaja(producto) {
    try {
      await api.productos.darDeBaja(token, producto.id)
      await cargarProductos()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Productos</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {esAdministrador && (
        <form
          onSubmit={handleCrear}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="codigo">
              Código
            </label>
            <input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Agregando...' : 'Nuevo producto'}
          </button>
          {errorForm && <p className="w-full text-sm text-red-600">{errorForm}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Datos históricos</th>
              {esAdministrador && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={5}>
                  Cargando...
                </td>
              </tr>
            )}

            {!cargando && productos.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={5}>
                  No hay productos todavía.
                </td>
              </tr>
            )}

            {productos.map((producto) => (
              <tr key={producto.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-700">{producto.codigo}</td>
                <td className="px-4 py-3 text-slate-700">{producto.nombre}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      producto.activo
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                        : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                    }
                  >
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/productos/${producto.id}/datos`} className="text-slate-900 underline">
                    Ver datos
                  </Link>
                </td>
                {esAdministrador && (
                  <td className="px-4 py-3">
                    {producto.activo && (
                      <button
                        type="button"
                        onClick={() => handleDarDeBaja(producto)}
                        className="text-red-600 hover:underline"
                      >
                        Dar de baja
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
