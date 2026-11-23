import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import Desplegable from '../components/Desplegable'
import Paginador from '../components/Paginador'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'

const ROLES = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'gerente', etiqueta: 'Gerente' },
]

function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UsuariosPage() {
  const { token, user } = useAuth()
  const esAdministrador = user?.role === 'administrador'

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('gerente')
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  const pag = usePaginacion(usuarios.length, 10)

  async function cargarUsuarios() {
    setCargando(true)
    try {
      const data = await api.usuarios.listar(token)
      setUsuarios(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (esAdministrador) cargarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCrear(event) {
    event.preventDefault()
    setErrorForm('')

    if (!name || !email || !password) {
      setErrorForm('Completa nombre, correo y contraseña.')
      return
    }
    if (password.length < 8) {
      setErrorForm('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      await api.usuarios.crear(token, { name, email, password, role })
      setName('')
      setEmail('')
      setPassword('')
      setRole('gerente')
      await cargarUsuarios()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  // Defensa en profundidad: el backend ya rechaza esto (middleware 'admin'),
  // pero si un gerente entra por URL directa no debe ni ver el formulario.
  if (!esAdministrador) {
    return (
      <div>
        <Titulo>Usuarios</Titulo>
        <Tarjeta className="p-6 text-texto-sec">Esta sección es solo para administradores.</Tarjeta>
      </div>
    )
  }

  return (
    <div>
      <Titulo subtitulo="Cuentas con acceso al sistema.">Usuarios</Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}

      <Tarjeta className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Nueva cuenta</h2>
        <form onSubmit={handleCrear} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="nombre" etiqueta="Nombre">
            <Entrada id="nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Campo>
          <Campo id="correo" etiqueta="Correo">
            <Entrada
              id="correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Campo>
          <Campo id="password" etiqueta="Contraseña" ayuda="Mínimo 8 caracteres.">
            <Entrada
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Campo>
          <Campo id="rol" etiqueta="Rol">
            <Desplegable id="rol" value={role} onChange={setRole} opciones={ROLES} />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-4">
            <Boton type="submit" disabled={enviando} className="w-full sm:w-auto">
              {enviando ? 'Creando…' : 'Crear usuario'}
            </Boton>
          </div>
        </form>
        {errorForm && <Aviso className="mt-4">{errorForm}</Aviso>}
      </Tarjeta>

      {cargando && <BarraCarga etiqueta="Cargando usuarios…" />}

      {!cargando && usuarios.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">No hay usuarios todavía.</Tarjeta>
      )}

      {!cargando && usuarios.length > 0 && (
        <>
          {/* Celular: una tarjeta por usuario. */}
          <ul className="grid gap-3 sm:hidden">
            {pag.slice(usuarios).map((u) => (
              <li key={u.id}>
                <Tarjeta className="p-4">
                  <p className="font-medium break-words">{u.name}</p>
                  <p className="mt-1 text-sm text-texto-sec break-words">{u.email}</p>
                  <p className="mt-2 text-sm capitalize text-texto-sec">
                    {u.role} · desde {formatearFecha(u.created_at)}
                  </p>
                </Tarjeta>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-borde bg-tarjeta shadow-md sm:hidden">
            <Paginador {...pag} onCambiar={pag.setPagina} />
          </div>

          {/* Tableta y escritorio: tabla. */}
          <div className="hidden sm:block">
            <Tabla etiqueta="Usuarios" pie={<Paginador {...pag} onCambiar={pag.setPagina} />}>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>Correo</Th>
                  <Th>Rol</Th>
                  <Th>Desde</Th>
                </tr>
              </thead>
              <tbody>
                {pag.slice(usuarios).map((u) => (
                  <Fila key={u.id}>
                    <Td>{u.name}</Td>
                    <Td className="text-texto-sec">{u.email}</Td>
                    <Td className="capitalize">{u.role}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{formatearFecha(u.created_at)}</Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}
    </div>
  )
}
