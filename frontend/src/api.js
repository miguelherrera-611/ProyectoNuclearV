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

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
    crear: (token, { name, email, password, role, permisos }) =>
      request('/api/usuarios', { method: 'POST', body: { name, email, password, role, permisos }, token }),
    editar: (token, id, { name, email, password, role, permisos }) =>
      request(`/api/usuarios/${id}`, { method: 'PUT', body: { name, email, password, role, permisos }, token }),
    eliminar: (token, id) => request(`/api/usuarios/${id}`, { method: 'DELETE', token }),
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
    eliminarPermanente: (token, tipo, id) => request(`/api/papelera/${tipo}/${id}`, { method: 'DELETE', token }),
  },

  auditoria: {
    // crudo: true porque esto viene paginado por el servidor (puede crecer
    // mucho con el tiempo, a diferencia de Productos/Usuarios/Observaciones
    // que sí se traen completos y se paginan en el navegador).
    listar: (token, pagina = 1) => request(`/api/auditoria?page=${pagina}`, { token, crudo: true }),
  },
}

export { ApiError }
