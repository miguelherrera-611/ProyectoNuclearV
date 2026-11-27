import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import Paginador from '../components/Paginador'
import { Aviso, BarraCarga, Boton, Fila, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'

const NOMBRE_TIPO = {
  productos: 'Producto',
  observaciones: 'Observación',
  usuarios: 'Usuario',
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Cuántos días faltan para que se purgue solo — en vez de solo mostrar la
// fecha, que el administrador vea de un vistazo si hay algo con poco tiempo.
function diasRestantes(sePurgaEn) {
  const ms = new Date(sePurgaEn).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default function PapeleraPage() {
  const { token, user } = useAuth()
  const puedeVer = user?.permisos?.includes('papelera.ver')
  const puedeRestaurar = user?.permisos?.includes('papelera.restaurar')
  const puedeEliminarPermanente = user?.permisos?.includes('papelera.eliminar_permanente')

  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const pag = usePaginacion(items.length, 10)

  async function cargar() {
    setCargando(true)
    try {
      setItems(await api.papelera.listar(token))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (puedeVer) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRestaurar(item) {
    try {
      await api.papelera.restaurar(token, item.tipo, item.id)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEliminarPermanente(item) {
    try {
      await api.papelera.eliminarPermanente(token, item.tipo, item.id)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!puedeVer) {
    return (
      <div>
        <Titulo>Papelera</Titulo>
        <Tarjeta className="p-6 text-texto-sec">Esta sección es solo para administradores.</Tarjeta>
      </div>
    )
  }

  return (
    <div>
      <Titulo subtitulo="Lo que se eliminó de Productos, Observaciones y Usuarios. Se borra solo a los 30 días.">
        Papelera
      </Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}
      {cargando && <BarraCarga etiqueta="Cargando la papelera…" />}

      {!cargando && items.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">La papelera está vacía.</Tarjeta>
      )}

      {!cargando && items.length > 0 && (
        <Tabla etiqueta="Papelera" pie={<Paginador {...pag} onCambiar={pag.setPagina} />}>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Descripción</Th>
              <Th>Eliminado</Th>
              <Th>Se purga en</Th>
              {(puedeRestaurar || puedeEliminarPermanente) && <Th>Acciones</Th>}
            </tr>
          </thead>
          <tbody>
            {pag.slice(items).map((item) => {
              const dias = diasRestantes(item.se_purga_en)
              return (
                <Fila key={`${item.tipo}-${item.id}`}>
                  <Td>{NOMBRE_TIPO[item.tipo]}</Td>
                  <Td className="break-words">{item.descripcion}</Td>
                  <Td className="whitespace-nowrap text-texto-sec">{formatearFecha(item.eliminado_en)}</Td>
                  <Td className="whitespace-nowrap">
                    {dias === 0 ? (
                      <span className="font-medium text-error">Hoy</span>
                    ) : (
                      `${dias} día${dias === 1 ? '' : 's'}`
                    )}
                  </Td>
                  {(puedeRestaurar || puedeEliminarPermanente) && (
                    <Td>
                      <div className="flex gap-3">
                        {puedeRestaurar && (
                          <Boton variante="texto" className="min-h-0 px-0 py-0" onClick={() => handleRestaurar(item)}>
                            Restaurar
                          </Boton>
                        )}
                        {puedeEliminarPermanente && (
                          <Boton
                            variante="texto"
                            className="min-h-0 px-0 py-0"
                            onClick={() => handleEliminarPermanente(item)}
                          >
                            Eliminar para siempre
                          </Boton>
                        )}
                      </div>
                    </Td>
                  )}
                </Fila>
              )
            })}
          </tbody>
        </Tabla>
      )}
    </div>
  )
}
