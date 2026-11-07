import { useState } from 'react'

// Fondo del inicio de sesión y la verificación 2FA (guía, sección 7): oscuro
// e inmersivo, siempre en modo oscuro sin importar la preferencia del
// usuario (la clase "dark" de este contenedor cambia los tokens).
//
// La guía pide además la foto de un mecanismo circular metálico; mientras el
// cliente no la entregue, el símbolo de marca son los tres anillos cian
// concéntricos (sección 4): planos, sin brillo, círculos perfectos y siempre
// completos, con margen alrededor.
export default function PantallaAcceso({ children }) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-noche px-4 py-10 text-texto sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Anillos />
          <p className="mt-4 font-display text-2xl font-bold sm:text-3xl">JR Forecast</p>
          <p className="mt-2 max-w-sm text-texto-sec">
            Pronósticos de producción · JR Mecanizados Industriales
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}

function Anillos() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="size-20 shrink-0 sm:size-24"
      role="img"
      aria-label="Anillos de JR Forecast"
    >
      <circle cx="100" cy="100" r="90" fill="none" stroke="#24d9e8" strokeWidth="3" />
      <circle cx="100" cy="100" r="64" fill="none" stroke="#24d9e8" strokeWidth="3" />
      <circle cx="100" cy="100" r="38" fill="none" stroke="#24d9e8" strokeWidth="3" />
      <text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="Montserrat, sans-serif"
        fontWeight="700"
        fontSize="30"
      >
        JR
      </text>
    </svg>
  )
}

// Campos del acceso: línea blanca fina y texto blanco (guía, sección 7).
// Si type="password", agrega solo un botón de texto para mostrar/ocultar
// (sin ícono nuevo: el patrón ya establecido en el resto del sistema es
// texto/símbolos planos, no SVG a la medida salvo el logo de marca).
export function CampoAcceso({ id, etiqueta, error, type, ...props }) {
  const esContrasena = type === 'password'
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          type={esContrasena ? (mostrar ? 'text' : 'password') : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block min-h-11 w-full border-0 border-b border-texto bg-transparent px-0 py-2 text-base text-texto placeholder:text-texto-sec focus:border-cian focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cian ${esContrasena ? 'pr-20' : ''}`}
          {...props}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setMostrar((actual) => !actual)}
            aria-pressed={mostrar}
            className="absolute inset-y-0 right-0 inline-flex items-center text-sm font-medium text-texto-sec underline-offset-4 hover:text-texto hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian"
          >
            {mostrar ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-2 text-sm text-texto">
          <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-error text-xs font-bold text-sobre-estado">
            ✕
          </span>
          {error}
        </p>
      )}
    </div>
  )
}
