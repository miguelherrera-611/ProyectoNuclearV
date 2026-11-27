import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import PantallaAcceso, { CampoAcceso } from '../components/PantallaAcceso'
import { Aviso, BarraCarga, Boton } from '../components/ui'

// Paso 1 del login: si las credenciales son correctas, el backend no
// entrega token todavía — manda un código por correo.
export default function LoginPage({ onSubmitted, onForgotPassword, mensaje }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})

    // Solo retroalimentación inmediata — la seguridad real la vuelve a
    // validar el backend.
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
      // Camino normal: data.challenge_token (va a la pantalla de 2FA).
      // Con AUTH_TWO_FACTOR_ENABLED=false en el backend: data.token directo.
      onSubmitted({ challengeToken: data.challenge_token, devCode: data.dev_code, token: data.token })
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PantallaAcceso>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="mb-8 font-display text-3xl font-bold sm:text-4xl">Iniciar sesión</h1>

        {mensaje && <Aviso tipo="exito" className="mb-6">{mensaje}</Aviso>}
        {errors.form && <Aviso className="mb-6">{errors.form}</Aviso>}

        <CampoAcceso
          id="email"
          etiqueta="Correo corporativo"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <CampoAcceso
          id="password"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <button
          type="button"
          onClick={onForgotPassword}
          className="mb-2 block text-sm font-medium text-texto-sec underline-offset-4 hover:text-texto hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cian"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <Boton type="submit" disabled={submitting} className="mt-4 w-full uppercase tracking-wide">
          Ingresar
        </Boton>
        {submitting && <BarraCarga etiqueta="Verificando credenciales…" />}
      </form>
    </PantallaAcceso>
  )
}
