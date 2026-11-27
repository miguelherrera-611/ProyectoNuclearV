import { useState } from 'react'
import { api } from '../api'
import PantallaAcceso, { CampoAcceso } from '../components/PantallaAcceso'
import { Aviso, BarraCarga, Boton } from '../components/ui'

// Dos pasos propios (igual de espíritu que Login → TwoFactor, pero sin
// sesión todavía): pedir el código por correo, y con ese código ya puesto
// más la contraseña nueva, restablecerla. Se valida con el mismo mecanismo
// de 2FA que el login (AuthController::olvidePassword/restablecerPassword).
export default function OlvidePasswordPage({ onBack, onCompleted }) {
  const [paso, setPaso] = useState('solicitar')
  const [email, setEmail] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [devCode, setDevCode] = useState('')
  const [code, setCode] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSolicitar(event) {
    event.preventDefault()
    setError('')

    if (!email) {
      setError('Ingresa tu correo.')
      return
    }

    setEnviando(true)
    try {
      const data = await api.olvidePassword(email)
      setChallengeToken(data.challenge_token)
      setDevCode(data.dev_code ?? '')
      setPaso('restablecer')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleRestablecer(event) {
    event.preventDefault()
    setError('')

    if (!code) {
      setError('Ingresa el código que te enviamos por correo.')
      return
    }
    if (!passwordNueva || passwordNueva.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      await api.restablecerPassword(challengeToken, code, passwordNueva)
      onCompleted()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'solicitar') {
    return (
      <PantallaAcceso>
        <form onSubmit={handleSolicitar} noValidate>
          <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Recuperar contraseña</h1>
          <p className="mb-8 text-texto-sec">Ingresa tu correo y te mandamos un código para restablecerla.</p>

          {error && <Aviso className="mb-6">{error}</Aviso>}

          <CampoAcceso
            id="email-recuperar"
            etiqueta="Correo corporativo"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Boton type="submit" disabled={enviando} className="mt-4 w-full uppercase tracking-wide">
            Enviar código
          </Boton>
          {enviando && <BarraCarga etiqueta="Enviando…" />}

          <Boton variante="texto" onClick={onBack} className="mt-3 w-full">
            Volver a iniciar sesión
          </Boton>
        </form>
      </PantallaAcceso>
    )
  }

  return (
    <PantallaAcceso>
      <form onSubmit={handleRestablecer} noValidate>
        <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Contraseña nueva</h1>
        <p className="mb-8 text-texto-sec">
          Si {email} está registrado, le llegó un código de 6 dígitos. Ingrésalo junto con tu contraseña nueva.
        </p>

        {devCode && (
          <Aviso tipo="alerta" className="mb-6">
            Modo desarrollo (todavía sin Brevo configurado): tu código es <strong>{devCode}</strong>.
          </Aviso>
        )}
        {error && <Aviso className="mb-6">{error}</Aviso>}

        <CampoAcceso
          id="code-recuperar"
          etiqueta="Código"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ letterSpacing: '0.5em' }}
        />

        <CampoAcceso
          id="password-nueva"
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
        />

        <Boton type="submit" disabled={enviando} className="mt-4 w-full uppercase tracking-wide">
          Restablecer contraseña
        </Boton>
        {enviando && <BarraCarga etiqueta="Restableciendo…" />}

        <Boton variante="texto" onClick={() => setPaso('solicitar')} className="mt-3 w-full">
          Volver
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
