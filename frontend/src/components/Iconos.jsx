// Íconos propios, trazo simple (stroke currentColor) para que hereden el
// color del texto donde se usen y funcionen igual en modo claro y oscuro,
// sin degradados ni colores nuevos (guía 2.4).

function Svg({ className = 'size-5', children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconoSol(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </Svg>
  )
}

export function IconoLuna(props) {
  return (
    <Svg fill="currentColor" stroke="none" {...props}>
      <path d="M12 2a9 9 0 1 0 9.998 9A7.2 7.2 0 0 1 12 2Z" />
    </Svg>
  )
}

export function IconoInicio(props) {
  return (
    <Svg {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </Svg>
  )
}

export function IconoProductos(props) {
  return (
    <Svg {...props}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </Svg>
  )
}

export function IconoPronostico(props) {
  return (
    <Svg {...props}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  )
}

export function IconoUsuarios(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M16 8.3a2.5 2.5 0 1 0 0-4.9" />
      <path d="M19.5 20c0-2.5-1.6-4.3-4-4.9" />
    </Svg>
  )
}

export function IconoPapelera(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <path d="M8 7v13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  )
}

export function IconoAuditoria(props) {
  return (
    <Svg {...props}>
      <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9 3h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3Z" />
      <path d="M9 11h6M9 15h6M9 7h2" />
    </Svg>
  )
}

export function IconoRestaurar(props) {
  return (
    <Svg {...props}>
      <path d="M3 10a9 9 0 1 1 2.6 6.4" />
      <path d="M3 4v6h6" />
    </Svg>
  )
}

export function IconoMenu(props) {
  return (
    <Svg {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  )
}

export function IconoX(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconoChevronAbajo(props) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function IconoCerrarSesion(props) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  )
}
