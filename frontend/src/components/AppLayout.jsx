import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTema } from '../tema/TemaContext'

const ENLACES = [
  { a: '/', texto: 'Inicio', exacto: true },
  { a: '/productos', texto: 'Productos' },
  { a: '/pronostico', texto: 'Pronóstico' },
]

const FOCO_BARRA = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian'

// Barra superior compartida por todas las pantallas autenticadas — mismo
// lugar, mismo comportamiento en cualquier sección. Según la guía (sección
// 6): franja índigo con texto blanco en claro; tarjeta oscura con una línea
// cian en oscuro. En pantallas angostas los enlaces van en un menú.
export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const { tema, alternarTema } = useTema()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const textoTema = tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'

  function claseEnlace({ isActive }) {
    return `flex min-h-11 items-center border-b-4 px-1 text-sm font-medium ${FOCO_BARRA} ${
      isActive ? 'border-cian text-barra-texto' : 'border-transparent text-barra-texto hover:border-barra-texto'
    }`
  }

  return (
    <div className="flex min-h-screen flex-col bg-fondo text-texto">
      <header className="border-b-2 border-barra-linea bg-barra text-barra-texto print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <NavLink to="/" className={`py-3 font-display text-lg font-bold ${FOCO_BARRA}`}>
              JR Forecast
            </NavLink>

            <nav aria-label="Principal" className="hidden items-stretch gap-6 self-stretch md:flex">
              {ENLACES.map((e) => (
                <NavLink key={e.a} to={e.a} end={e.exacto} className={claseEnlace}>
                  {e.texto}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-2 text-sm md:flex">
            <span className="mr-2 truncate">
              {user?.name} · <span className="capitalize">{user?.role}</span>
            </span>
            <button
              type="button"
              onClick={alternarTema}
              className={`min-h-11 px-3 font-medium hover:underline ${FOCO_BARRA}`}
            >
              {textoTema}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`min-h-11 border border-barra-texto px-4 font-display font-bold ${FOCO_BARRA}`}
            >
              Cerrar sesión
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            className={`flex min-h-11 items-center gap-2 px-2 text-sm font-medium md:hidden ${FOCO_BARRA}`}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {menuAbierto ? '✕' : '☰'}
            </span>
            Menú
          </button>
        </div>

        {menuAbierto && (
          <div id="menu-movil" className="px-4 pb-4 md:hidden">
            <nav aria-label="Principal" className="flex flex-col">
              {ENLACES.map((e) => (
                <NavLink
                  key={e.a}
                  to={e.a}
                  end={e.exacto}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center border-l-4 pl-3 text-base font-medium ${FOCO_BARRA} ${
                      isActive ? 'border-cian' : 'border-transparent'
                    }`
                  }
                >
                  {e.texto}
                </NavLink>
              ))}
            </nav>
            <p className="mt-4 text-sm">
              {user?.name} · <span className="capitalize">{user?.role}</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={alternarTema}
                className={`min-h-11 border border-barra-texto px-3 text-sm font-medium ${FOCO_BARRA}`}
              >
                {textoTema}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={`min-h-11 border border-barra-texto px-3 font-display text-sm font-bold ${FOCO_BARRA}`}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  )
}
