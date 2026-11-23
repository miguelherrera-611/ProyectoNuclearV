import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTema } from '../tema/TemaContext'
import { IconoCerrarSesion, IconoChevronAbajo, IconoLuna, IconoMenu, IconoSol } from './Iconos'
import Sidebar from './Sidebar'
import { usePopover } from './usePopover'

const ESTILO_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

// Un solo botón con los dos símbolos (el usuario ve de una qué modo activa
// cada lado) en vez de un ícono que cambia solo — el lado activo se marca
// con el color principal, nunca con un tono intermedio inventado.
function InterruptorTema() {
  const { tema, alternarTema } = useTema()
  const esOscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`flex items-center gap-0.5 rounded-full border border-campo p-1 ${ESTILO_FOCO}`}
    >
      <span className={`flex size-7 items-center justify-center rounded-full ${!esOscuro ? 'bg-principal text-sobre-principal' : 'text-texto-sec'}`}>
        <IconoSol className="size-4" />
      </span>
      <span className={`flex size-7 items-center justify-center rounded-full ${esOscuro ? 'bg-principal text-sobre-principal' : 'text-texto-sec'}`}>
        <IconoLuna className="size-4" />
      </span>
    </button>
  )
}

function Perfil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { abierto, alternar, cerrar, refContenedor } = usePopover()

  async function handleLogout() {
    cerrar()
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div ref={refContenedor} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={`flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-texto/5 ${ESTILO_FOCO}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-principal font-display text-sm font-bold text-sobre-principal">
          {iniciales(user?.name)}
        </span>
        <span className="hidden text-left text-sm sm:block">
          <span className="block font-medium text-texto">{user?.name}</span>
          <span className="block text-xs capitalize text-texto-sec">{user?.role}</span>
        </span>
        <IconoChevronAbajo className={`size-4 shrink-0 text-texto-sec transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-borde bg-tarjeta p-2 shadow-lg"
        >
          <div className="border-b border-borde px-3 py-2 sm:hidden">
            <p className="font-medium text-texto">{user?.name}</p>
            <p className="text-xs capitalize text-texto-sec">{user?.role}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={`mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-texto hover:bg-texto/5 ${ESTILO_FOCO}`}
          >
            <IconoCerrarSesion className="size-5 text-texto-sec" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// Columna (Sidebar) para navegar entre secciones + franja superior (solo
// controles: abrir el menú en móvil, modo claro/oscuro y la cuenta) — antes
// todo vivía apretado en una sola barra horizontal.
export default function AppLayout({ children }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  return (
    <div className="flex min-h-screen bg-fondo text-texto">
      <Sidebar abierto={sidebarAbierto} alCerrar={() => setSidebarAbierto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-borde bg-tarjeta px-4 sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setSidebarAbierto(true)}
            aria-label="Abrir menú"
            className={`flex size-10 items-center justify-center rounded-lg text-texto hover:bg-texto/5 md:hidden ${ESTILO_FOCO}`}
          >
            <IconoMenu className="size-6" />
          </button>

          <span className="font-display text-base font-bold text-texto md:hidden">JR Forecast</span>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <InterruptorTema />
            <Perfil />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
