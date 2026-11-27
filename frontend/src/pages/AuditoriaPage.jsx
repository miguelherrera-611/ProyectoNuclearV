import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import BarraFiltros from '../components/BarraFiltros'
import { Aviso, BarraCarga, Fila, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'

const ESTILO_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'
const ESTILO_BOTON =
  'flex min-h-9 items-center rounded-lg border border-campo px-3 text-sm font-medium text-texto hover:border-texto disabled:cursor-not-allowed disabled:border-borde disabled:text-texto-sec'

const NOMBRE_ACCION = {
  crear: 'Creó',
  editar: 'Editó',
  eliminar: 'Eliminó',
  restaurar: 'Restauró',
  eliminar_permanente: 'Eliminó para siempre',
}

const OPCIONES_ENTIDAD = [
  { valor: '', etiqueta: 'Todos los tipos' },
  { valor: 'Producto', etiqueta: 'Producto' },
  { valor: 'Observacion', etiqueta: 'Observación' },
  { valor: 'Usuario', etiqueta: 'Usuario' },
]

const OPCIONES_ACCION = [
  { valor: '', etiqueta: 'Todas las acciones' },
  ...Object.entries(NOMBRE_ACCION).map(([valor, etiqueta]) => ({ valor, etiqueta })),
]

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Server-paginado Y server-filtrado a propósito (distinto a
// usePaginacion/Paginador, que trabajan sobre una lista ya traída completa):
// la auditoría crece sin límite con el tiempo, así que cada página y cada
// filtro se piden al backend en vez de recortar algo que ya está en memoria.
export default function AuditoriaPage() {
  const { token, user } = useAuth()
  const puedeVer = user?.permisos?.includes('auditoria.ver')

  const [respuesta, setRespuesta] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')

  // Cambiar cualquier filtro vuelve a la página 1 ahí mismo (no con un
  // efecto aparte) — si no, se puede quedar "atascado" en una página que ya
  // no existe para el filtro nuevo.
  function cambiarBusqueda(valor) {
    setBusqueda(valor)
    setPagina(1)
  }
  function cambiarFiltroEntidad(valor) {
    setFiltroEntidad(valor)
    setPagina(1)
  }
  function cambiarFiltroAccion(valor) {
    setFiltroAccion(valor)
    setPagina(1)
  }

  useEffect(() => {
    if (!puedeVer) return

    async function cargar() {
      setCargando(true)
      try {
        setRespuesta(
          await api.auditoria.listar(token, pagina, {
            entidad: filtroEntidad,
            accion: filtroAccion,
            buscar: busqueda,
          }),
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [token, pagina, puedeVer, busqueda, filtroEntidad, filtroAccion])

  if (!puedeVer) {
    return (
      <div>
        <Titulo>Auditoría</Titulo>
        <Tarjeta className="p-6 text-texto-sec">Esta sección es solo para administradores.</Tarjeta>
      </div>
    )
  }

  const registros = respuesta?.data ?? []
  const hayFiltros = busqueda || filtroEntidad || filtroAccion

  return (
    <div>
      <Titulo subtitulo="Quién hizo qué, y cuándo, sobre Productos, Observaciones y Usuarios.">Auditoría</Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}

      <div data-tour="auditoria-filtros">
        <BarraFiltros
          busqueda={busqueda}
          onBusqueda={cambiarBusqueda}
          placeholderBusqueda="Buscar por descripción…"
          filtros={[
            { id: 'filtro-entidad', value: filtroEntidad, onChange: cambiarFiltroEntidad, opciones: OPCIONES_ENTIDAD },
            { id: 'filtro-accion', value: filtroAccion, onChange: cambiarFiltroAccion, opciones: OPCIONES_ACCION },
          ]}
        />
      </div>

      {cargando && <BarraCarga etiqueta="Cargando la auditoría…" />}

      {!cargando && registros.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">
          {hayFiltros ? 'Nada coincide con el filtro.' : 'Todavía no hay nada registrado.'}
        </Tarjeta>
      )}

      {!cargando && registros.length > 0 && (
        <div data-tour="auditoria-tabla">
        <Tabla
          etiqueta="Auditoría"
          pie={
            respuesta.last_page > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-borde px-4 py-3 text-sm sm:flex-row">
                <p className="text-texto-sec">
                  {respuesta.from}–{respuesta.to} de {respuesta.total}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => p - 1)}
                    disabled={pagina === 1}
                    className={`${ESTILO_BOTON} ${ESTILO_FOCO}`}
                  >
                    Anterior
                  </button>
                  <span className="whitespace-nowrap text-texto-sec">
                    Página {respuesta.current_page} de {respuesta.last_page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => p + 1)}
                    disabled={pagina === respuesta.last_page}
                    className={`${ESTILO_BOTON} ${ESTILO_FOCO}`}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )
          }
        >
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Quién</Th>
              <Th>Acción</Th>
              <Th>Descripción</Th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <Fila key={r.id}>
                <Td className="whitespace-nowrap text-texto-sec">{formatearFecha(r.created_at)}</Td>
                <Td>{r.usuario?.name ?? 'Sistema (purga automática)'}</Td>
                <Td>{NOMBRE_ACCION[r.accion] ?? r.accion}</Td>
                <Td className="break-words">{r.descripcion}</Td>
              </Fila>
            ))}
          </tbody>
        </Tabla>
        </div>
      )}
    </div>
  )
}
