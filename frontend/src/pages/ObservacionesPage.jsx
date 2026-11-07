import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import SelectorMes from '../components/SelectorMes'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Kpi, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { formatearPeriodo, formatearUnidades } from '../format'

const ESTILO_ENLACE_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'

export default function ObservacionesPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const esAdministrador = user?.role === 'administrador'

  const [producto, setProducto] = useState(null)
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
    api.productos
      .listar(token)
      .then((lista) => setProducto(lista.find((p) => String(p.id) === String(id)) ?? null))
      .catch(() => {})
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

  const total = observaciones.reduce((suma, o) => suma + Number(o.cantidad), 0)
  const promedio = observaciones.length > 0 ? total / observaciones.length : null

  return (
    <div>
      <Link to="/productos" className={`mb-4 inline-flex min-h-11 items-center text-sm text-texto-sec hover:underline ${ESTILO_ENLACE_FOCO}`}>
        ← Volver a productos
      </Link>

      <Titulo
        subtitulo={producto?.nombre}
        acciones={
          // Un solo botón principal por pantalla: si el administrador tiene el
          // formulario de captura, este pasa a secundario.
          <Link
            to={`/pronostico?producto=${id}`}
            className={`inline-flex min-h-11 items-center justify-center px-5 py-2 font-display text-sm font-bold ${
              esAdministrador
                ? 'border border-campo text-texto hover:border-texto'
                : 'bg-principal text-sobre-principal hover:bg-principal-hover'
            } ${ESTILO_ENLACE_FOCO}`}
          >
            Calcular pronóstico con estos datos →
          </Link>
        }
      >
        Datos históricos
      </Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}

      {observaciones.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Kpi etiqueta="Periodos" valor={observaciones.length} />
          <Kpi etiqueta="Total" valor={formatearUnidades(total)} />
          <Kpi etiqueta="Promedio mensual" valor={formatearUnidades(promedio)} />
        </div>
      )}

      {esAdministrador && (
        <Tarjeta className="mb-6 p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Capturar o corregir un mes</h2>
          <form onSubmit={handleCapturar} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <Campo id="mes" etiqueta="Mes">
              <SelectorMes id="mes" value={mes} onChange={setMes} />
            </Campo>
            <Campo id="cantidad" etiqueta="Demanda (u)">
              <Entrada
                id="cantidad"
                type="number"
                min="0"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </Campo>
            <Boton type="submit" disabled={enviando} className="w-full sm:w-auto">
              {enviando ? 'Guardando…' : 'Guardar'}
            </Boton>
          </form>
          {errorForm && <Aviso className="mt-4">{errorForm}</Aviso>}
        </Tarjeta>
      )}

      {cargando && <BarraCarga etiqueta="Cargando datos…" />}

      {!cargando && observaciones.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">Todavía no hay periodos capturados para este producto.</Tarjeta>
      )}

      {!cargando && observaciones.length > 0 && (
        <Tabla etiqueta="Datos históricos">
          <thead>
            <tr>
              <Th>Periodo</Th>
              <Th numero>Demanda</Th>
              {esAdministrador && <Th className="text-right">Acciones</Th>}
            </tr>
          </thead>
          <tbody>
            {observaciones.map((o) => (
              <Fila key={o.id}>
                <Td>{formatearPeriodo(o.periodo)}</Td>
                <Td numero>{formatearUnidades(o.cantidad)}</Td>
                {esAdministrador && (
                  <Td className="text-right">
                    <Boton
                      variante="texto"
                      className="min-h-0 px-0 py-0"
                      onClick={() => handleEliminar(o.id)}
                      aria-label={`Eliminar ${formatearPeriodo(o.periodo)}`}
                    >
                      Eliminar
                    </Boton>
                  </Td>
                )}
              </Fila>
            ))}
          </tbody>
        </Tabla>
      )}
    </div>
  )
}
