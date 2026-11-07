import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

const TemaContext = createContext(null)
const CLAVE = 'jr-forecast-tema'

// Preferencia de interfaz, no un dato de seguridad: por eso sí se recuerda
// en localStorage (a diferencia del token). Puede fallar en modo privado,
// así que todo acceso va en try/catch.
function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    // sin almacenamiento disponible: se usa la preferencia del sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
    try {
      localStorage.setItem(CLAVE, tema)
    } catch {
      // ignorado: la preferencia solo dura esta visita
    }
  }, [tema])

  function alternarTema() {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'))
  }

  // El reporte PDF siempre va con los colores del modo claro (guía, sección
  // 7), también si se imprime con Ctrl+P. Los tokens CSS ya cambian solos
  // con @media print; los gráficos toman sus colores de este estado, así que
  // se pasa a claro de forma síncrona antes de imprimir y se vuelve después.
  const temaActual = useRef(tema)

  useEffect(() => {
    temaActual.current = tema
  }, [tema])

  useEffect(() => {
    let anterior = null

    function antes() {
      anterior = temaActual.current
      flushSync(() => setTema('claro'))
    }

    function despues() {
      if (anterior) setTema(anterior)
      anterior = null
    }

    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [])

  function imprimirReporte() {
    window.print()
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema, imprimirReporte }}>{children}</TemaContext.Provider>
  )
}

export function useTema() {
  const context = useContext(TemaContext)
  if (!context) {
    throw new Error('useTema debe usarse dentro de TemaProvider')
  }
  return context
}
