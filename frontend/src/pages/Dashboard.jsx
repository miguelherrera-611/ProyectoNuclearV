import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'

// Pantalla que se ve tras pasar el login + 2FA. Sirve también como "prueba"
// de que todo el flujo funciona de verdad: llama a una ruta protegida del
// backend (/api/auth/me) para confirmar que el token recibido realmente
// autoriza, no solo que el frontend "cree" que el login salió bien.
export default function Dashboard({ onLoggedOut }) {
  const { token, user, logout } = useAuth()
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .me(token)
      .then(setMe)
      .catch((err) => setError(err.message))
  }, [token])

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

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {me && (
          <p className="mb-6 text-sm text-slate-500">
            Ruta protegida verificada: sesión activa para {me.email}.
          </p>
        )}

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
