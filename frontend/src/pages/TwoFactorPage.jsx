import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

// Paso 2 del login: el código de 6 dígitos. Si es correcto, acá recién se
// obtiene el token de acceso real (ver AuthContext.verifyTwoFactor).
export default function TwoFactorPage({ challengeToken, devCode, onBack, onVerified }) {
  const { verifyTwoFactor } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!code) {
      setError('Ingresa el código que te enviamos por correo.')
      return
    }

    setSubmitting(true)
    try {
      await verifyTwoFactor(challengeToken, code)
      onVerified()
    } catch (err) {
      setError(err.message)
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
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Verifica tu identidad</h1>
        <p className="mb-6 text-sm text-slate-500">
          Te enviamos un código de 6 dígitos por correo. Ingrésalo para continuar.
        </p>

        {/* Este bloque solo aparece si el backend está corriendo en modo
            desarrollo sin una API key de Brevo configurada todavía — así se
            puede probar el flujo completo de 2FA sin un correo real. En
            producción (o con la key configurada) `devCode` nunca llega y
            este bloque no se muestra. */}
        {devCode && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Modo desarrollo (todavía sin Brevo configurado): tu código es <strong>{devCode}</strong>.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="code">
          Código
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mb-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Verificando...' : 'Verificar'}
        </button>

        {/* Permite volver al paso 1 por si el usuario se equivocó de correo
            (no hay forma de reenviar el código desde acá: solo se pide uno
            nuevo haciendo login de nuevo). */}
        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          Volver
        </button>
      </form>
    </div>
  )
}
