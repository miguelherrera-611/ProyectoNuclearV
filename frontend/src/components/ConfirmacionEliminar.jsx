import { useEffect, useRef, useState } from 'react'
import { Boton, Campo, Entrada } from './ui'

// Diálogo propio (no window.confirm() del navegador: no se puede estilizar
// ni traducir sus botones, y no encaja con el resto del sistema de diseño).
// Un solo componente para toda la app — Productos, Observaciones, Usuarios y
// la Papelera lo usan igual, solo cambia el texto. "requierePassword" es
// para lo verdaderamente irreversible (eliminar para siempre de la
// papelera): ahí no basta un clic, se pide la contraseña de quien confirma.
export default function ConfirmacionEliminar({
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  permanente = false,
  requierePassword = false,
  // Error del servidor (ej. "Contraseña incorrecta.") — a diferencia de la
  // validación local de abajo, este lo pone el padre y NO cierra el
  // diálogo: el usuario tiene que poder corregir y reintentar sin volver a
  // abrirlo.
  error = '',
  enviando = false,
  onConfirmar,
  onCancelar,
}) {
  const [password, setPassword] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const refBoton = useRef(null)
  const refPassword = useRef(null)

  useEffect(() => {
    ;(requierePassword ? refPassword : refBoton).current?.focus()

    function manejarEscape(event) {
      if (event.key === 'Escape') onCancelar()
    }

    document.addEventListener('keydown', manejarEscape)
    return () => document.removeEventListener('keydown', manejarEscape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function confirmar() {
    if (requierePassword && !password) {
      setErrorPassword('Escribe tu contraseña para confirmar.')
      return
    }
    onConfirmar(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-noche/60" aria-hidden="true" onClick={onCancelar} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-eliminar-titulo"
        className="relative w-full max-w-sm rounded-xl border border-borde bg-tarjeta p-6 shadow-xl"
      >
        <h2 id="confirmacion-eliminar-titulo" className="font-display text-lg font-bold text-texto">
          {titulo}
        </h2>
        <p className="mt-2 text-sm text-texto-sec">
          {mensaje}{' '}
          {permanente ? (
            <span className="font-medium text-error">Esto no se puede deshacer.</span>
          ) : (
            'Se enviará a la papelera de reciclaje — podrás restaurarlo hasta por 30 días, antes de que se borre para siempre.'
          )}
        </p>

        {requierePassword && (
          <Campo
            id="confirmacion-password"
            etiqueta="Tu contraseña"
            error={errorPassword || error}
            className="mt-4"
          >
            <Entrada
              ref={refPassword}
              id="confirmacion-password"
              type="password"
              autoComplete="current-password"
              disabled={enviando}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorPassword('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && confirmar()}
            />
          </Campo>
        )}
        {!requierePassword && error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Boton variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton ref={refBoton} variante="destructivo-solido" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Eliminando…' : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  )
}
