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
    const user = await completeLoginWithToken(data.token)
    return { ...data, user }
  }

  // Si AUTH_TWO_FACTOR_ENABLED=false en el backend, /auth/login entrega el
  // token directo (sin challenge_token) — este es ese segundo camino para
  // cerrar la sesión, con la misma lógica de "pedir quién es el usuario
  // aparte" que ya usa verifyTwoFactor.
  async function completeLoginWithToken(token) {
    const user = await api.me(token)
    setToken(token)
    setUser(user)
    return user
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
    <AuthContext.Provider value={{ token, user, login, verifyTwoFactor, completeLoginWithToken, logout }}>
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
