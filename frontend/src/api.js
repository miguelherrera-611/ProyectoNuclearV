// fetch nativo en vez de axios: alcanza para este caso sin agregar una
// dependencia de más.

const API_URL = import.meta.env.VITE_API_URL

// Error propio para leer mensaje y código HTTP por separado en los
// componentes.
class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, token, crudo = false } = {}) {
  const headers = {
    Accept: 'application/json',
  }

  // FormData (fotos de perfil, usuarios) se manda tal cual — el navegador le
  // pone su propio Content-Type con el boundary; si uno se fija a mano acá,
  // el multipart queda mal armado y el backend no recibe el archivo.
  const esFormData = body instanceof FormData

  if (body !== undefined && !esFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
  })

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Ocurrió un error inesperado.', response.status)
  }

  // El backend envuelve sus respuestas en { "data": ... } — se desenvuelve
  // acá una sola vez en vez de repetir `.data` en cada componente.
  // "crudo" se salta eso: lo necesita la paginación de Auditoría, que viene
  // del paginate() de Laravel y trae "meta" (total, página actual...) junto
  // a "data", no los dos juntos haría perder esa información.
  return crudo ? payload : (payload?.data ?? payload)
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  verifyTwoFactor: (challenge_token, code) =>
    request('/api/auth/verify-two-factor', { method: 'POST', body: { challenge_token, code } }),
  olvidePassword: (email) => request('/api/auth/olvide-password', { method: 'POST', body: { email } }),
  restablecerPassword: (challenge_token, code, password_nueva) =>
    request('/api/auth/restablecer-password', { method: 'POST', body: { challenge_token, code, password_nueva } }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
  me: (token) => request('/api/auth/me', { token }),

  productos: {
    listar: (token) => request('/api/productos', { token }),
    crear: (token, { codigo, nombre }) =>
      request('/api/productos', { method: 'POST', body: { codigo, nombre }, token }),
    editar: (token, id, { codigo, nombre }) =>
      request(`/api/productos/${id}`, { method: 'PUT', body: { codigo, nombre }, token }),
    eliminar: (token, id) => request(`/api/productos/${id}`, { method: 'DELETE', token }),
  },

  observaciones: {
    listar: (token, productoId) =>
      request(`/api/observaciones?producto_id=${productoId}`, { token }),
    capturar: (token, { producto_id, periodo, cantidad }) =>
      request('/api/observaciones', { method: 'POST', body: { producto_id, periodo, cantidad }, token }),
    eliminar: (token, id) => request(`/api/observaciones/${id}`, { method: 'DELETE', token }),
  },

  usuarios: {
    listar: (token) => request('/api/usuarios', { token }),
    catalogoPermisos: (token) => request('/api/usuarios/catalogo-permisos', { token }),
    // Sin foto: igual que siempre, JSON normal. Con foto: FormData — un
    // array suelto (permisos) no viaja bien en multipart, así que ahí se
    // manda como texto con JSON.stringify y el backend lo decodifica
    // (UsuarioController::decodificarPermisosSiVienenComoTexto).
    crear: (token, { name, email, password, role, permisos, avatar }) => {
      if (!avatar) {
        return request('/api/usuarios', { method: 'POST', body: { name, email, password, role, permisos }, token })
      }
      const form = new FormData()
      form.append('name', name)
      form.append('email', email)
      form.append('password', password)
      form.append('role', role)
      if (permisos) form.append('permisos', JSON.stringify(permisos))
      form.append('avatar', avatar)
      return request('/api/usuarios', { method: 'POST', body: form, token })
    },
    editar: (token, id, { name, email, password, role, permisos, avatar }) => {
      if (!avatar) {
        return request(`/api/usuarios/${id}`, { method: 'PUT', body: { name, email, password, role, permisos }, token })
      }
      // PHP nunca llena $_FILES en una request PUT real, sin importar que
      // venga de fetch y no de un <form> — por eso el archivo va por POST
      // con "_method=PUT" (spoofing que Laravel sí entiende) a esta misma URL.
      const form = new FormData()
      form.append('_method', 'PUT')
      form.append('name', name)
      form.append('email', email)
      if (password) form.append('password', password)
      form.append('role', role)
      if (permisos) form.append('permisos', JSON.stringify(permisos))
      form.append('avatar', avatar)
      return request(`/api/usuarios/${id}`, { method: 'POST', body: form, token })
    },
    eliminar: (token, id) => request(`/api/usuarios/${id}`, { method: 'DELETE', token }),
  },

  perfil: {
    actualizar: (token, name) => request('/api/perfil', { method: 'PUT', body: { name }, token }),
    subirAvatar: (token, archivo) => {
      const form = new FormData()
      form.append('avatar', archivo)
      return request('/api/perfil/avatar', { method: 'POST', body: form, token })
    },
    cambiarPassword: (token, password_actual, password_nueva) =>
      request('/api/perfil/password', { method: 'PUT', body: { password_actual, password_nueva }, token }),
    solicitarCambioCorreo: (token, nuevo_correo) =>
      request('/api/perfil/cambiar-correo/solicitar', { method: 'POST', body: { nuevo_correo }, token }),
    confirmarCambioCorreo: (token, challenge_token, code) =>
      request('/api/perfil/cambiar-correo/confirmar', { method: 'POST', body: { challenge_token, code }, token }),
  },

  pronosticos: {
    // body = { producto_id, metodo, ...parámetros del método } (n, pesos, alpha, beta...)
    calcular: (token, body) => request('/api/pronosticos/calcular', { method: 'POST', body, token }),
    // El mejor método (menor MAD) ya calculado por producto activo, en un
    // solo viaje al servidor — esto es lo que usa el Dashboard.
    resumen: (token) => request('/api/pronosticos/resumen', { token }),
  },

  papelera: {
    listar: (token) => request('/api/papelera', { token }),
    restaurar: (token, tipo, id) => request(`/api/papelera/${tipo}/${id}/restaurar`, { method: 'POST', token }),
    eliminarPermanente: (token, tipo, id, password) =>
      request(`/api/papelera/${tipo}/${id}`, { method: 'DELETE', body: { password }, token }),
  },

  auditoria: {
    // crudo: true porque esto viene paginado por el servidor (puede crecer
    // mucho con el tiempo, a diferencia de Productos/Usuarios/Observaciones
    // que sí se traen completos y se paginan en el navegador) — por eso los
    // filtros también se mandan al servidor, no se aplican sobre una lista
    // ya traída.
    listar: (token, pagina = 1, { entidad = '', accion = '', buscar = '' } = {}) => {
      const parametros = new URLSearchParams({ page: pagina })
      if (entidad) parametros.set('entidad', entidad)
      if (accion) parametros.set('accion', accion)
      if (buscar) parametros.set('buscar', buscar)
      return request(`/api/auditoria?${parametros}`, { token, crudo: true })
    },
  },
}

export { ApiError }
