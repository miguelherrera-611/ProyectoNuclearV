import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

// Paso 1 del login: correo + contraseña. Si son correctos, el backend NO
// entrega ningún token todavía — manda un código por correo y este
// componente avisa al padre (App.jsx) para pasar a la pantalla de 2FA.
export default function LoginPage({ onSubmitted }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})

    // Validación en el frontend: es solo para dar retroalimentación
    // inmediata (mejor experiencia). La seguridad real está en el backend,
    // que vuelve a validar todo — cualquier validación de acá se puede
    // saltar fácilmente (ej. llamando a la API directo).
    if (!email) {
      setErrors({ email: 'Ingresa tu correo.' })
      return
    }
    if (!password) {
      setErrors({ password: 'Ingresa tu contraseña.' })
      return
    }

    setSubmitting(true)
    try {
      const data = await login(email, password)
      // challengeToken identifica el desafío 2FA; devCode solo viene si el
      // backend está en modo desarrollo (sin Brevo configurado todavía).
      onSubmitted({ challengeToken: data.challenge_token, devCode: data.dev_code })
    } catch (error) {
      // Mensaje genérico que ya viene armado así desde el backend a
      // propósito: nunca revela si el correo existe o no.
      setErrors({ form: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Iniciar sesión</h1>

        {errors.form && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {errors.email && <p className="mb-3 text-sm text-red-600">{errors.email}</p>}

        <label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {errors.password && <p className="mb-3 text-sm text-red-600">{errors.password}</p>}

        {/* Deshabilitado mientras se envía, para evitar doble-click /
            doble-submit mientras se espera la respuesta del backend. */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Enviando...' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
