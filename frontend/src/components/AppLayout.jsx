import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Barra de navegación compartida por todas las pantallas autenticadas —
// mismo lugar, mismo comportamiento en cualquier sección (Intuitividad).
export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="text-slate-900">
              JR Forecast
            </Link>
            <Link to="/productos" className="hover:text-slate-900">
              Productos
            </Link>
            <Link to="/pronostico" className="hover:text-slate-900">
              Pronóstico
            </Link>
          </nav>

          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>
              {user?.name} · <span className="capitalize">{user?.role}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
