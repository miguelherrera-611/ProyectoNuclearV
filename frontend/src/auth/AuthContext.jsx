import { createContext, useContext, useState } from 'react'
import { api } from '../api'

// Context de React: guarda el estado de sesión (token + usuario) en un solo
// lugar y lo pone a disposición de cualquier componente de la app a través
// de useAuth(), sin tener que pasarlo a mano de componente en componente.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Decisión de seguridad a propósito: el token vive SOLO en memoria
  // (useState), nunca en localStorage ni sessionStorage. Consecuencia
  // directa: si el usuario refresca la página, la sesión se pierde y hay
  // que volver a loguearse (con 2FA incluido). A cambio, se gana que un
  // ataque XSS en el sitio no pueda robarse el token leyendo el storage del
  // navegador — porque el token simplemente no está guardado ahí.
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  // Paso 1 del login: solo valida credenciales y dispara el envío del
  // código. Todavía NO guarda token ni usuario — eso recién pasa en
  // verifyTwoFactor(), una vez confirmado el segundo factor.
  async function login(email, password) {
    return api.login(email, password)
  }

  // Paso 2: si el código es correcto, acá sí se guarda la sesión en memoria.
  async function verifyTwoFactor(challengeToken, code) {
    const data = await api.verifyTwoFactor(challengeToken, code)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function logout() {
    try {
      await api.logout(token) // avisa al backend que revoque el token
    } finally {
      // Se limpia el estado local aunque la llamada al backend falle (ej.
      // sin conexión) — no tiene sentido dejar al usuario "atascado" logueado
      // en el frontend solo porque la petición de logout no llegó.
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, login, verifyTwoFactor, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook de conveniencia para leer el contexto desde cualquier componente:
// const { user, logout } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
