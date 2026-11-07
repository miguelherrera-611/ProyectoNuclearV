import { createContext, useContext, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Token solo en memoria a propósito, nunca localStorage/sessionStorage:
  // un refresh cierra la sesión, pero un XSS no puede robarlo leyendo el
  // storage del navegador.
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  async function login(email, password) {
    return api.login(email, password)
  }

  async function verifyTwoFactor(challengeToken, code) {
    const data = await api.verifyTwoFactor(challengeToken, code)
    // El endpoint de 2FA solo entrega el token (responsabilidad única);
    // quién es el usuario se pide aparte con el token recién obtenido.
    const user = await api.me(data.token)
    setToken(data.token)
    setUser(user)
    return { ...data, user }
  }

  async function logout() {
    try {
      await api.logout(token)
    } finally {
      // Se limpia el estado local aunque la llamada falle — no debe quedar
      // "atascado" logueado en el frontend solo porque no hubo conexión.
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
