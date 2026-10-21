import { useAuth } from '../auth/AuthContext'

// Pantalla que se ve tras pasar el login + 2FA. Usa directamente el `user`
// que ya devolvió verify-two-factor (guardado en AuthContext) — no vuelve a
// pedirlo a /api/auth/me, porque sería la misma información otra vez.
export default function Dashboard({ onLoggedOut }) {
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout() // revoca el token en el backend y limpia el estado local
    onLoggedOut()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          Bienvenido, {user?.name ?? '...'}
        </h1>

        <p className="mb-6 text-sm text-slate-500">Sesión activa para {user?.email}.</p>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
