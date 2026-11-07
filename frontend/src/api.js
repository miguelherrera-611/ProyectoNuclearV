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

async function request(path, { method = 'GET', body, token } = {}) {
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
  return payload?.data ?? payload
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  verifyTwoFactor: (challenge_token, code) =>
    request('/api/auth/verify-two-factor', { method: 'POST', body: { challenge_token, code } }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),

  productos: {
    listar: (token) => request('/api/productos', { token }),
    crear: (token, { codigo, nombre }) =>
      request('/api/productos', { method: 'POST', body: { codigo, nombre }, token }),
    editar: (token, id, { codigo, nombre }) =>
      request(`/api/productos/${id}`, { method: 'PUT', body: { codigo, nombre }, token }),
    darDeBaja: (token, id) => request(`/api/productos/${id}`, { method: 'DELETE', token }),
  },

  observaciones: {
    listar: (token, productoId) =>
      request(`/api/observaciones?producto_id=${productoId}`, { token }),
    capturar: (token, { producto_id, periodo, cantidad }) =>
      request('/api/observaciones', { method: 'POST', body: { producto_id, periodo, cantidad }, token }),
    eliminar: (token, id) => request(`/api/observaciones/${id}`, { method: 'DELETE', token }),
  },

  pronosticos: {
    calcular: (token, { producto_id, n }) =>
      request('/api/pronosticos/calcular', { method: 'POST', body: { producto_id, n }, token }),
  },
}

export { ApiError }
