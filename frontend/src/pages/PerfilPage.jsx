import { useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Tarjeta, Titulo } from '../components/ui'

export default function PerfilPage() {
  const { token, user, actualizarUsuario } = useAuth()

  return (
    <div>
      <Titulo subtitulo="Tu foto, tu nombre, tu correo y tu contraseña — nadie más puede verlos ni cambiarlos.">
        Mi perfil
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-2">
        <SeccionFoto user={user} token={token} actualizarUsuario={actualizarUsuario} />
        <SeccionNombre user={user} token={token} actualizarUsuario={actualizarUsuario} />
        <SeccionCorreo user={user} token={token} actualizarUsuario={actualizarUsuario} />
        <SeccionPassword token={token} />
      </div>
    </div>
  )
}

function SeccionFoto({ user, token, actualizarUsuario }) {
  const inputRef = useRef(null)
  const [previa, setPrevia] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function elegirArchivo(event) {
    const elegido = event.target.files?.[0]
    if (!elegido) return
    setArchivo(elegido)
    setPrevia(URL.createObjectURL(elegido))
    setError('')
    setExito(false)
  }

  async function guardar() {
    setEnviando(true)
    setError('')
    setExito(false)
    try {
      const data = await api.perfil.subirAvatar(token, archivo)
      actualizarUsuario({ avatar_url: data.avatar_url })
      setArchivo(null)
      setPrevia(null)
      setExito(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Tarjeta className="p-4 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">Foto de perfil</h2>
      <div className="flex items-center gap-4">
        {previa ? (
          <img src={previa} alt="" className="size-16 shrink-0 rounded-full object-cover" />
        ) : (
          <Avatar nombre={user?.name} url={user?.avatar_url} tamano="size-16" />
        )}
        <div className="flex flex-wrap gap-3">
          <Boton variante="secundario" onClick={() => inputRef.current?.click()}>
            Elegir foto
          </Boton>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={elegirArchivo}
          />
          {archivo && (
            <Boton onClick={guardar} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar foto'}
            </Boton>
          )}
        </div>
      </div>
      {enviando && <BarraCarga etiqueta="Subiendo…" />}
      {exito && <Aviso tipo="exito" className="mt-4">Foto actualizada.</Aviso>}
      {error && <Aviso className="mt-4">{error}</Aviso>}
    </Tarjeta>
  )
}

function SeccionNombre({ user, token, actualizarUsuario }) {
  const [name, setName] = useState(user?.name ?? '')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setExito(false)

    if (!name.trim()) {
      setError('El nombre no puede quedar vacío.')
      return
    }

    setEnviando(true)
    try {
      const data = await api.perfil.actualizar(token, name.trim())
      actualizarUsuario({ name: data.name })
      setExito(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Tarjeta className="p-4 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">Nombre</h2>
      <form onSubmit={handleSubmit}>
        <Campo id="perfil-nombre" etiqueta="Nombre completo">
          <Entrada id="perfil-nombre" value={name} onChange={(e) => setName(e.target.value)} />
        </Campo>
        <Boton type="submit" disabled={enviando} className="mt-4">
          {enviando ? 'Guardando…' : 'Guardar nombre'}
        </Boton>
        {exito && <Aviso tipo="exito" className="mt-4">Nombre actualizado.</Aviso>}
        {error && <Aviso className="mt-4">{error}</Aviso>}
      </form>
    </Tarjeta>
  )
}

// Cambiar de correo pide confirmación por 2FA al CORREO ACTUAL (no al
// nuevo): es la prueba de que quien pide el cambio es de verdad el dueño de
// la cuenta — ver PerfilController::solicitarCambioCorreo.
function SeccionCorreo({ user, token, actualizarUsuario }) {
  const [paso, setPaso] = useState('mostrar')
  const [nuevoCorreo, setNuevoCorreo] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [devCode, setDevCode] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function empezar() {
    setPaso('solicitar')
    setNuevoCorreo('')
    setError('')
    setExito(false)
  }

  function cancelar() {
    setPaso('mostrar')
    setError('')
  }

  async function handleSolicitar(event) {
    event.preventDefault()
    setError('')

    if (!nuevoCorreo) {
      setError('Ingresa el correo nuevo.')
      return
    }

    setEnviando(true)
    try {
      const data = await api.perfil.solicitarCambioCorreo(token, nuevoCorreo)
      setChallengeToken(data.challenge_token)
      setDevCode(data.dev_code ?? '')
      setCode('')
      setPaso('confirmar')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleConfirmar(event) {
    event.preventDefault()
    setError('')

    if (!code) {
      setError('Ingresa el código que te enviamos a tu correo actual.')
      return
    }

    setEnviando(true)
    try {
      const data = await api.perfil.confirmarCambioCorreo(token, challengeToken, code)
      actualizarUsuario({ email: data.email })
      setExito(true)
      setPaso('mostrar')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Tarjeta className="p-4 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">Correo</h2>

      {paso === 'mostrar' && (
        <>
          <p className="text-sm text-texto-sec">Correo actual</p>
          <p className="mb-4 break-words font-medium text-texto">{user?.email}</p>
          <Boton variante="secundario" onClick={empezar}>
            Cambiar correo
          </Boton>
          {exito && <Aviso tipo="exito" className="mt-4">Correo actualizado.</Aviso>}
        </>
      )}

      {paso === 'solicitar' && (
        <form onSubmit={handleSolicitar}>
          <p className="mb-4 text-sm text-texto-sec">
            Te mandamos un código de verificación a tu correo ACTUAL ({user?.email}) para confirmar que de verdad eres
            tú — no al correo nuevo.
          </p>
          <Campo id="correo-nuevo" etiqueta="Correo nuevo">
            <Entrada
              id="correo-nuevo"
              type="email"
              value={nuevoCorreo}
              onChange={(e) => setNuevoCorreo(e.target.value)}
              autoComplete="email"
            />
          </Campo>
          <div className="mt-4 flex gap-3">
            <Boton type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar código'}
            </Boton>
            <Boton type="button" variante="secundario" onClick={cancelar}>
              Cancelar
            </Boton>
          </div>
          {error && <Aviso className="mt-4">{error}</Aviso>}
        </form>
      )}

      {paso === 'confirmar' && (
        <form onSubmit={handleConfirmar}>
          <p className="mb-4 text-sm text-texto-sec">
            Ingresa el código de 6 dígitos que te llegó a {user?.email} para confirmar el cambio a {nuevoCorreo}.
          </p>
          {devCode && (
            <Aviso tipo="alerta" className="mb-4">
              Modo desarrollo (todavía sin Brevo configurado): tu código es <strong>{devCode}</strong>.
            </Aviso>
          )}
          <Campo id="codigo-correo" etiqueta="Código">
            <Entrada
              id="codigo-correo"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ letterSpacing: '0.3em' }}
            />
          </Campo>
          <div className="mt-4 flex gap-3">
            <Boton type="submit" disabled={enviando}>
              {enviando ? 'Confirmando…' : 'Confirmar cambio'}
            </Boton>
            <Boton type="button" variante="secundario" onClick={cancelar}>
              Cancelar
            </Boton>
          </div>
          {error && <Aviso className="mt-4">{error}</Aviso>}
        </form>
      )}
    </Tarjeta>
  )
}

function SeccionPassword({ token }) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setExito(false)

    if (!passwordActual || !passwordNueva) {
      setError('Completa tu contraseña actual y la nueva.')
      return
    }
    if (passwordNueva.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.')
      return
    }
    if (passwordNueva !== confirmacion) {
      setError('La confirmación no coincide con la contraseña nueva.')
      return
    }

    setEnviando(true)
    try {
      await api.perfil.cambiarPassword(token, passwordActual, passwordNueva)
      setPasswordActual('')
      setPasswordNueva('')
      setConfirmacion('')
      setExito(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Tarjeta className="p-4 sm:p-6 lg:col-span-2">
      <h2 className="mb-4 font-display text-lg font-bold">Contraseña</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
        <Campo id="password-actual" etiqueta="Contraseña actual">
          <Entrada
            id="password-actual"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            autoComplete="current-password"
          />
        </Campo>
        <Campo id="password-nueva-perfil" etiqueta="Contraseña nueva">
          <Entrada
            id="password-nueva-perfil"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            autoComplete="new-password"
          />
        </Campo>
        <Campo id="password-confirmar" etiqueta="Confirmar contraseña nueva">
          <Entrada
            id="password-confirmar"
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
          />
        </Campo>
        <div className="sm:col-span-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </Boton>
        </div>
        {exito && (
          <Aviso tipo="exito" className="sm:col-span-3">
            Contraseña actualizada.
          </Aviso>
        )}
        {error && <Aviso className="sm:col-span-3">{error}</Aviso>}
      </form>
    </Tarjeta>
  )
}
