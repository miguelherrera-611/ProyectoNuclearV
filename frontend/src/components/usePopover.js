import { useEffect, useRef, useState } from 'react'

// Mecánica compartida de "ventana emergente" (Desplegable, SelectorMes):
// abrir/cerrar, cerrar al hacer clic afuera, cerrar con Escape.
export function usePopover() {
  const [abierto, setAbierto] = useState(false)
  const refContenedor = useRef(null)

  useEffect(() => {
    if (!abierto) return

    function manejarClicFuera(event) {
      if (refContenedor.current && !refContenedor.current.contains(event.target)) {
        setAbierto(false)
      }
    }

    function manejarEscape(event) {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', manejarClicFuera)
    document.addEventListener('keydown', manejarEscape)
    return () => {
      document.removeEventListener('mousedown', manejarClicFuera)
      document.removeEventListener('keydown', manejarEscape)
    }
  }, [abierto])

  return {
    abierto,
    alternar: () => setAbierto((actual) => !actual),
    cerrar: () => setAbierto(false),
    refContenedor,
  }
}
