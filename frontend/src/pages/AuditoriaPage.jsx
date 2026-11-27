import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
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

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Server-paginado a propósito (distinto a usePaginacion/Paginador, que
// paginan en el navegador una lista ya completa): la auditoría crece sin
// límite con el tiempo, así que acá cada página se pide al backend.
export default function AuditoriaPage() {
  const { token, user } = useAuth()
  const puedeVer = user?.permisos?.includes('auditoria.ver')

  const [respuesta, setRespuesta] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!puedeVer) return

    async function cargar() {
      setCargando(true)
      try {
        setRespuesta(await api.auditoria.listar(token, pagina))
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [token, pagina, puedeVer])

  if (!puedeVer) {
    return (
      <div>
        <Titulo>Auditoría</Titulo>
        <Tarjeta className="p-6 text-texto-sec">Esta sección es solo para administradores.</Tarjeta>
      </div>
    )
  }

  const registros = respuesta?.data ?? []

  return (
    <div>
      <Titulo subtitulo="Quién hizo qué, y cuándo, sobre Productos, Observaciones y Usuarios.">Auditoría</Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}
      {cargando && <BarraCarga etiqueta="Cargando la auditoría…" />}

      {!cargando && registros.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">Todavía no hay nada registrado.</Tarjeta>
      )}

      {!cargando && registros.length > 0 && (
        <Tabla
          etiqueta="Auditoría"
          pie={
            respuesta.meta.last_page > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-borde px-4 py-3 text-sm sm:flex-row">
                <p className="text-texto-sec">
                  {respuesta.meta.from}–{respuesta.meta.to} de {respuesta.meta.total}
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
                    Página {respuesta.meta.current_page} de {respuesta.meta.last_page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => p + 1)}
                    disabled={pagina === respuesta.meta.last_page}
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
      )}
    </div>
  )
}
