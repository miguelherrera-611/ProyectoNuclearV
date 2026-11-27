import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  IconoAuditoria,
  IconoCerrarSesion,
  IconoInicio,
  IconoPapelera,
  IconoProductos,
  IconoPronostico,
  IconoUsuarios,
  IconoX,
} from './Iconos'

const ENLACES = [
  { a: '/', texto: 'Inicio', exacto: true, Icono: IconoInicio },
  { a: '/productos', texto: 'Productos', Icono: IconoProductos },
  { a: '/pronostico', texto: 'Pronóstico', Icono: IconoPronostico },
]

// Enlaces que dependen de un permiso puntual (no del rol): la restricción
// real vive en el backend (Gate por permiso), esto solo evita que alguien
// sin el permiso vea un enlace a una pantalla que de todas formas le va a
// rechazar la petición.
const ENLACES_CON_PERMISO = [
  { permiso: 'usuarios.ver', a: '/usuarios', texto: 'Usuarios', Icono: IconoUsuarios },
  { permiso: 'papelera.ver', a: '/papelera', texto: 'Papelera', Icono: IconoPapelera },
  { permiso: 'auditoria.ver', a: '/auditoria', texto: 'Auditoría', Icono: IconoAuditoria },
]

const FOCO_BARRA = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian'

function Enlaces({ onNavegar }) {
  const { user } = useAuth()
  const enlaces = [
    ...ENLACES,
    ...ENLACES_CON_PERMISO.filter(({ permiso }) => user?.permisos?.includes(permiso)),
  ]

  function claseEnlace({ isActive }) {
    return `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${FOCO_BARRA} ${
      isActive
        ? 'bg-tarjeta text-principal'
        : 'text-barra-texto hover:bg-barra-texto/10'
    }`
  }

  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      {enlaces.map(({ a, texto, exacto, Icono }) => (
        <NavLink key={a} to={a} end={exacto} onClick={onNavegar} className={claseEnlace}>
          <Icono className="size-5 shrink-0" />
          {texto}
        </NavLink>
      ))}
    </nav>
  )
}

// Abajo del todo, separado de las secciones por una línea — cerrar sesión no
// es "una sección más" para navegar, así que no va mezclado en <Enlaces>.
function BotonCerrarSesion({ onNavegar }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    onNavegar?.()
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="mt-auto border-t border-barra-linea px-3 pt-3">
      <button
        type="button"
        onClick={handleLogout}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-barra-texto hover:bg-barra-texto/10 ${FOCO_BARRA}`}
      >
        <IconoCerrarSesion className="size-5 shrink-0" />
        Cerrar sesión
      </button>
    </div>
  )
}

// Navegación de la app (antes vivía en la barra superior horizontal): franja
// índigo con texto blanco en claro, tarjeta oscura con línea cian en oscuro
// — mismos tokens que ya usaba la barra (sección 6 de la guía), solo que
// ahora es la columna fija de la izquierda en vez del encabezado.
export default function Sidebar({ abierto, alCerrar }) {
  return (
    <>
      {/* Desktop: columna fija, siempre visible, pegada a la izquierda —
          "sticky" + la altura exacta del viewport, para que no se desplace
          junto con el contenido de la derecha (si no, "Cerrar sesión" se
          queda abajo del todo, fuera de vista, en páginas largas). */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-barra-linea bg-barra py-6 text-barra-texto md:flex print:hidden">
        <div className="mb-6 px-4">
          <span className="font-display text-lg font-bold text-barra-texto">JR Forecast</span>
        </div>
        <Enlaces />
        <BotonCerrarSesion />
      </aside>

      {/* Móvil: panel deslizante sobre una cortina oscura, se cierra tocando
          afuera, con Equis, o al elegir una sección. */}
      {abierto && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-noche/60" aria-hidden="true" onClick={alCerrar} />
          <aside className="relative flex w-72 max-w-[80vw] flex-col bg-barra py-6 text-barra-texto shadow-xl">
            <div className="mb-6 flex items-center justify-between px-4">
              <span className="font-display text-lg font-bold text-barra-texto">JR Forecast</span>
              <button
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar menú"
                className={`flex size-9 items-center justify-center rounded-lg hover:bg-barra-texto/10 ${FOCO_BARRA}`}
              >
                <IconoX className="size-5" />
              </button>
            </div>
            <Enlaces onNavegar={alCerrar} />
            <BotonCerrarSesion onNavegar={alCerrar} />
          </aside>
        </div>
      )}
    </>
  )
}
