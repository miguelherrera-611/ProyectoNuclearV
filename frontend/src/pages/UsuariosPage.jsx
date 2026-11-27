import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import ConfirmacionEliminar from '../components/ConfirmacionEliminar'
import Desplegable from '../components/Desplegable'
import Paginador from '../components/Paginador'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'

const ROLES = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'gerente', etiqueta: 'Gerente' },
]

const FORMULARIO_VACIO = { id: null, name: '', email: '', password: '', role: 'gerente', permisos: [] }

function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UsuariosPage() {
  const { token, user } = useAuth()
  const puedeVer = user?.permisos?.includes('usuarios.ver')
  const puedeCrear = user?.permisos?.includes('usuarios.crear')
  const puedeEliminar = user?.permisos?.includes('usuarios.eliminar')

  const [usuarios, setUsuarios] = useState([])
  const [catalogo, setCatalogo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // La lista es lo primero que se ve; el formulario solo aparece al pedirlo
  // (botón "Crear cuenta" o "Editar" en una fila), no de entrada.
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  const pag = usePaginacion(usuarios.length, 10)
  const editando = form.id !== null

  async function cargarTodo() {
    setCargando(true)
    try {
      const [listaUsuarios, listaCatalogo] = await Promise.all([
        api.usuarios.listar(token),
        api.usuarios.catalogoPermisos(token),
      ])
      setUsuarios(listaUsuarios)
      setCatalogo(listaCatalogo)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (puedeVer) cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al elegir el rol (creando, o editando), se parte de lo que trae ese rol
  // por defecto — de ahí el administrador agrega o quita lo que quiera para
  // esta persona en particular.
  function cambiarRol(role) {
    setForm((f) => ({ ...f, role, permisos: catalogo?.default_por_rol[role] ?? [] }))
  }

  function alternarPermiso(clave) {
    setForm((f) => ({
      ...f,
      permisos: f.permisos.includes(clave) ? f.permisos.filter((p) => p !== clave) : [...f.permisos, clave],
    }))
  }

  function abrirCrear() {
    setForm(FORMULARIO_VACIO)
    setErrorForm('')
    setMostrarFormulario(true)
  }

  function editarUsuario(u) {
    setForm({ id: u.id, name: u.name, email: u.email, password: '', role: u.role, permisos: u.permisos })
    setErrorForm('')
    setMostrarFormulario(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setForm(FORMULARIO_VACIO)
    setErrorForm('')
    setMostrarFormulario(false)
  }

  async function handleGuardar(event) {
    event.preventDefault()
    setErrorForm('')

    if (!form.name || !form.email || (!editando && !form.password)) {
      setErrorForm('Completa nombre, correo' + (editando ? '' : ' y contraseña') + '.')
      return
    }
    if (form.password && form.password.length < 8) {
      setErrorForm('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      const datos = { name: form.name, email: form.email, role: form.role, permisos: form.permisos }
      if (form.password) datos.password = form.password

      if (editando) {
        await api.usuarios.editar(token, form.id, datos)
      } else {
        await api.usuarios.crear(token, datos)
      }
      setForm(FORMULARIO_VACIO)
      setMostrarFormulario(false)
      await cargarTodo()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null)

  async function confirmarEliminar() {
    const usuario = usuarioAEliminar
    setUsuarioAEliminar(null)
    try {
      await api.usuarios.eliminar(token, usuario.id)
      await cargarTodo()
    } catch (err) {
      setError(err.message)
    }
  }

  // Defensa en profundidad: el backend ya rechaza esto (Gate por permiso),
  // pero si alguien entra por URL directa no debe ni ver el formulario.
  if (!puedeVer) {
    return (
      <div>
        <Titulo>Usuarios</Titulo>
        <Tarjeta className="p-6 text-texto-sec">Esta sección es solo para administradores.</Tarjeta>
      </div>
    )
  }

  return (
    <div>
      <Titulo
        subtitulo="Cuentas con acceso al sistema y sus permisos."
        acciones={puedeCrear && !mostrarFormulario && <Boton onClick={abrirCrear}>Crear cuenta</Boton>}
      >
        Usuarios
      </Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}

      {mostrarFormulario && (
        <Tarjeta className="mb-6 p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">{editando ? `Editar a ${form.name}` : 'Nueva cuenta'}</h2>
          <form onSubmit={handleGuardar}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo id="nombre" etiqueta="Nombre">
                <Entrada
                  id="nombre"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
              </Campo>
              <Campo id="correo" etiqueta="Correo">
                <Entrada
                  id="correo"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </Campo>
              <Campo
                id="password"
                etiqueta="Contraseña"
                ayuda={editando ? 'Vacío = no cambiarla' : 'Mínimo 8 caracteres.'}
              >
                <Entrada
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </Campo>
              <Campo id="rol" etiqueta="Rol">
                <Desplegable id="rol" value={form.role} onChange={cambiarRol} opciones={ROLES} />
              </Campo>
            </div>

            {catalogo && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-texto">Permisos de esta persona</p>
                <div className="grid gap-x-6 gap-y-2 rounded-lg border border-borde p-4 sm:grid-cols-2">
                  {Object.entries(catalogo.permisos).map(([clave, etiqueta]) => (
                    <label key={clave} className="flex min-h-9 items-center gap-2 text-sm text-texto">
                      <input
                        type="checkbox"
                        checked={form.permisos.includes(clave)}
                        onChange={() => alternarPermiso(clave)}
                        className="size-4 rounded border-campo text-principal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                      />
                      {etiqueta}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-texto-sec">
                  Se marcaron solos los permisos por defecto de "{ROLES.find((r) => r.valor === form.role)?.etiqueta}"
                  — agrega o quita lo que necesites para esta persona en particular.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Boton type="submit" disabled={enviando}>
                {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}
              </Boton>
              <Boton type="button" variante="secundario" onClick={cancelarEdicion}>
                Cancelar
              </Boton>
            </div>
          </form>
          {errorForm && <Aviso className="mt-4">{errorForm}</Aviso>}
        </Tarjeta>
      )}

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
                  <div className="mt-3 flex gap-3">
                    {puedeCrear && (
                      <Boton variante="texto" onClick={() => editarUsuario(u)}>
                        Editar
                      </Boton>
                    )}
                    {puedeEliminar && u.id !== user.id && (
                      <Boton variante="destructivo" onClick={() => setUsuarioAEliminar(u)}>
                        Eliminar
                      </Boton>
                    )}
                  </div>
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
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pag.slice(usuarios).map((u) => (
                  <Fila key={u.id}>
                    <Td>{u.name}</Td>
                    <Td className="text-texto-sec">{u.email}</Td>
                    <Td className="capitalize">{u.role}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{formatearFecha(u.created_at)}</Td>
                    <Td>
                      <div className="flex gap-3">
                        {puedeCrear && (
                          <Boton variante="texto" className="min-h-0 px-0 py-0" onClick={() => editarUsuario(u)}>
                            Editar
                          </Boton>
                        )}
                        {puedeEliminar && u.id !== user.id && (
                          <Boton
                            variante="destructivo"
                            className="min-h-0 px-0 py-0"
                            onClick={() => setUsuarioAEliminar(u)}
                          >
                            Eliminar
                          </Boton>
                        )}
                      </div>
                    </Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}

      {usuarioAEliminar && (
        <ConfirmacionEliminar
          titulo={`¿Eliminar a ${usuarioAEliminar.name}?`}
          mensaje={`Se eliminará la cuenta ${usuarioAEliminar.email} y se cerrará su sesión si la tenía abierta.`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setUsuarioAEliminar(null)}
        />
      )}
    </div>
  )
}
