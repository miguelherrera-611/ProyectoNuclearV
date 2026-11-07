import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import PantallaAcceso, { CampoAcceso } from '../components/PantallaAcceso'
import { Aviso, BarraCarga, Boton } from '../components/ui'

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
    <PantallaAcceso>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Verifica tu identidad</h1>
        <p className="mb-8 text-texto-sec">
          Te enviamos un código de 6 dígitos por correo. Ingrésalo para continuar.
        </p>

        {/* Solo llega devCode si el backend está en modo desarrollo sin
            Brevo configurado; en producción nunca aparece. */}
        {devCode && (
          <Aviso tipo="alerta" className="mb-6">
            Modo desarrollo (todavía sin Brevo configurado): tu código es <strong>{devCode}</strong>.
          </Aviso>
        )}

        {error && <Aviso className="mb-6">{error}</Aviso>}

        <CampoAcceso
          id="code"
          etiqueta="Código"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ letterSpacing: '0.5em' }}
        />

        <Boton type="submit" disabled={submitting} className="mt-4 w-full uppercase tracking-wide">
          Verificar
        </Boton>
        {submitting && <BarraCarga etiqueta="Verificando código…" />}

        {/* No hay reenvío de código — solo volver a hacer login pide uno nuevo. */}
        <Boton variante="texto" onClick={onBack} className="mt-3 w-full">
          Volver
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
