// Capa única de comunicación con el backend (Laravel). Se usa `fetch` nativo
// en vez de una librería como axios a propósito: para este caso, fetch ya
// resuelve todo lo necesario sin agregar una dependencia de más.

const API_URL = import.meta.env.VITE_API_URL

// Error propio para poder leer el mensaje del backend y el código HTTP por
// separado en los componentes (en vez de un Error genérico de fetch).
class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/**
 * Función base que arman todas las llamadas a la API. Centraliza:
 * - Mandar siempre Accept: application/json (así el backend responde en
 *   JSON incluso en los errores, en vez de una página HTML).
 * - Agregar el header Authorization cuando hay token.
 * - Convertir cualquier respuesta que no sea 2xx en un ApiError, para que
 *   los componentes solo necesiten un try/catch simple.
 */
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

  // logout() responde 204 (sin contenido) — no hay nada que parsear.
  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Ocurrió un error inesperado.', response.status)
  }

  // El backend envuelve sus respuestas en { "data": ... } — acá se
  // "desenvuelve" una sola vez para que el resto del código use el dato
  // directo, sin repetir `.data` en cada componente.
  return payload?.data ?? payload
}

// Un método por cada endpoint de la API.
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
