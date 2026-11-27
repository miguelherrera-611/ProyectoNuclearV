import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import BarraFiltros from '../components/BarraFiltros'
import ConfirmacionEliminar from '../components/ConfirmacionEliminar'
import Paginador from '../components/Paginador'
import SelectorMes from '../components/SelectorMes'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Kpi, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'
import { formatearPeriodo, formatearUnidades } from '../format'

const ESTILO_ENLACE_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'

export default function ObservacionesPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const puedeCapturar = user?.permisos?.includes('observaciones.capturar')
  const puedeEliminar = user?.permisos?.includes('observaciones.eliminar')

  const [producto, setProducto] = useState(null)
  const [observaciones, setObservaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [filtroAnio, setFiltroAnio] = useState('')
  const anios = [...new Set(observaciones.map((o) => o.periodo.slice(0, 4)))].sort().reverse()
  const opcionesAnio = [{ valor: '', etiqueta: 'Todos los años' }, ...anios.map((a) => ({ valor: a, etiqueta: a }))]
  const observacionesFiltradas = filtroAnio
    ? observaciones.filter((o) => o.periodo.startsWith(filtroAnio))
    : observaciones

  const pag = usePaginacion(observacionesFiltradas.length, 10, `${id}|${filtroAnio}`)

  const [mes, setMes] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false)
  const [archivoImportar, setArchivoImportar] = useState(null)
  const [importando, setImportando] = useState(false)
  const [erroresImportar, setErroresImportar] = useState([])
  const inputImportarRef = useRef(null)

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
    setExito('')

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
      setExito('Dato guardado.')
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleDescargarPlantilla() {
    setDescargandoPlantilla(true)
    setError('')
    try {
      await api.observaciones.descargarPlantilla(token, id)
    } catch (err) {
      setError(err.message)
    } finally {
      setDescargandoPlantilla(false)
    }
  }

  function elegirArchivoImportar(event) {
    setArchivoImportar(event.target.files?.[0] ?? null)
    setErroresImportar([])
  }

  async function handleImportar() {
    setErroresImportar([])
    setExito('')

    if (!archivoImportar) {
      setErroresImportar(['Elige el archivo de la plantilla llena.'])
      return
    }

    setImportando(true)
    try {
      const data = await api.observaciones.importar(token, id, archivoImportar)
      setArchivoImportar(null)
      if (inputImportarRef.current) inputImportarRef.current.value = ''
      await cargar()
      setExito(`Se importaron ${data.total} meses: ${data.creados} nuevos, ${data.corregidos} corregidos.`)
    } catch (err) {
      setErroresImportar(err.errores ?? [err.message])
    } finally {
      setImportando(false)
    }
  }

  const [observacionAEliminar, setObservacionAEliminar] = useState(null)

  async function confirmarEliminar() {
    const observacion = observacionAEliminar
    setObservacionAEliminar(null)
    setError('')
    try {
      await api.observaciones.eliminar(token, observacion.id)
      await cargar()
      setExito('Observación eliminada. Quedó en la papelera.')
    } catch (err) {
      setError(err.message)
    }
  }

  const total = observacionesFiltradas.reduce((suma, o) => suma + Number(o.cantidad), 0)
  const promedio = observacionesFiltradas.length > 0 ? total / observacionesFiltradas.length : null

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
            className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2 font-display text-sm font-bold ${
              puedeCapturar
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
      {exito && <Aviso tipo="exito" className="mb-6">{exito}</Aviso>}

      {observacionesFiltradas.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Kpi etiqueta="Periodos" valor={observacionesFiltradas.length} />
          <Kpi etiqueta="Total" valor={formatearUnidades(total)} />
          <Kpi etiqueta="Promedio mensual" valor={formatearUnidades(promedio)} />
        </div>
      )}

      {puedeCapturar && (
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

      {puedeCapturar && (
        <Tarjeta className="mb-6 p-4 sm:p-6">
          <h2 className="mb-1 font-display text-lg font-bold">Importar desde Excel</h2>
          <p className="mb-4 text-sm text-texto-sec">
            La plantilla ya viene con los meses que este producto tenga — agrega los que falten abajo y vuelve a
            subirla. Si hay un error en alguna fila, no se importa nada; corrígela y vuelve a intentar.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Boton type="button" variante="secundario" onClick={handleDescargarPlantilla} disabled={descargandoPlantilla}>
              {descargandoPlantilla ? 'Descargando…' : 'Descargar plantilla'}
            </Boton>
            <input
              ref={inputImportarRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={elegirArchivoImportar}
            />
            <Boton type="button" variante="secundario" onClick={() => inputImportarRef.current?.click()}>
              {archivoImportar ? archivoImportar.name : 'Elegir archivo lleno'}
            </Boton>
            <Boton type="button" onClick={handleImportar} disabled={importando || !archivoImportar}>
              {importando ? 'Importando…' : 'Importar'}
            </Boton>
          </div>
          {erroresImportar.length > 0 && (
            <div className="mt-4">
              <Aviso>El archivo tiene errores — no se importó nada:</Aviso>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-texto-sec">
                {erroresImportar.map((mensaje, i) => (
                  <li key={i}>{mensaje}</li>
                ))}
              </ul>
            </div>
          )}
        </Tarjeta>
      )}

      {cargando && <BarraCarga etiqueta="Cargando datos…" />}

      {!cargando && observaciones.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">Todavía no hay periodos capturados para este producto.</Tarjeta>
      )}

      {!cargando && observaciones.length > 0 && (
        <BarraFiltros filtros={[{ id: 'filtro-anio', value: filtroAnio, onChange: setFiltroAnio, opciones: opcionesAnio }]} />
      )}

      {!cargando && observaciones.length > 0 && observacionesFiltradas.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">No hay datos capturados para {filtroAnio}.</Tarjeta>
      )}

      {!cargando && observacionesFiltradas.length > 0 && (
        <Tabla etiqueta="Datos históricos" pie={<Paginador {...pag} onCambiar={pag.setPagina} />}>
          <thead>
            <tr>
              <Th>Periodo</Th>
              <Th numero>Demanda</Th>
              {puedeEliminar && <Th className="text-right">Acciones</Th>}
            </tr>
          </thead>
          <tbody>
            {pag.slice(observacionesFiltradas).map((o) => (
              <Fila key={o.id}>
                <Td>{formatearPeriodo(o.periodo)}</Td>
                <Td numero>{formatearUnidades(o.cantidad)}</Td>
                {puedeEliminar && (
                  <Td className="text-right">
                    <Boton
                      variante="destructivo"
                      className="min-h-0 px-0 py-0"
                      onClick={() => setObservacionAEliminar(o)}
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

      {observacionAEliminar && (
        <ConfirmacionEliminar
          titulo={`¿Eliminar ${formatearPeriodo(observacionAEliminar.periodo)}?`}
          mensaje={`Se eliminará la observación de ${formatearUnidades(observacionAEliminar.cantidad)}.`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setObservacionAEliminar(null)}
        />
      )}
    </div>
  )
}
