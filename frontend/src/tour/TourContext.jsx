import { createContext, useContext, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { PASOS } from './pasos'

const TourContext = createContext(null)

// -1 = guía inactiva. Los pasos se filtran por permiso una sola vez al
// entrar (igual que el Sidebar): si el usuario no tiene ese permiso, ni se
// le navega a esa sección.
export function TourProvider({ children }) {
  const { user } = useAuth()
  const [indice, setIndice] = useState(-1)

  const pasos = useMemo(
    () => PASOS.filter((p) => !p.permiso || user?.permisos?.includes(p.permiso)),
    [user],
  )

  const activo = indice >= 0 && indice < pasos.length
  const paso = activo ? pasos[indice] : null

  function iniciar() {
    setIndice(0)
  }
  function detener() {
    setIndice(-1)
  }
  function siguiente() {
    setIndice((i) => (i + 1 < pasos.length ? i + 1 : -1))
  }
  function anterior() {
    setIndice((i) => Math.max(0, i - 1))
  }

  const valor = { activo, paso, indice, total: pasos.length, iniciar, detener, siguiente, anterior }

  return <TourContext.Provider value={valor}>{children}</TourContext.Provider>
}

export function useTour() {
  return useContext(TourContext)
}
