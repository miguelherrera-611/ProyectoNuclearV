// Piezas de la guía de identidad JR (sección 6): esquinas rectas, sin
// sombras, separadas por color de fondo y un borde fino. Todas usan los
// tokens de index.css, así que el modo oscuro sale solo.

const ESTILO_FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'

const ESTILO_CAMPO =
  'block min-h-11 w-full border border-campo bg-tarjeta px-3 py-2 text-base text-texto placeholder:text-texto-sec focus:outline-2 focus:-outline-offset-1 focus:outline-foco sm:text-sm'

export function Titulo({ children, subtitulo, acciones }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight text-texto sm:text-4xl">{children}</h1>
        {subtitulo && <p className="mt-2 text-texto-sec">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{acciones}</div>}
    </div>
  )
}

export function Tarjeta({ children, className = '' }) {
  return <section className={`border border-borde bg-tarjeta ${className}`}>{children}</section>
}

// Un solo botón "principal" por pantalla (guía 2.4); el resto, secundario.
export function Boton({ variante = 'principal', className = '', type = 'button', ...props }) {
  const variantes = {
    principal:
      'bg-principal text-sobre-principal hover:bg-principal-hover disabled:bg-borde disabled:text-texto-sec',
    secundario:
      'border border-campo bg-transparent text-texto hover:border-texto disabled:border-borde disabled:text-texto-sec',
    texto: 'text-texto underline-offset-4 hover:underline',
  }

  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center px-5 py-2 font-display text-sm font-bold disabled:cursor-not-allowed ${variantes[variante]} ${ESTILO_FOCO} ${className}`}
      {...props}
    />
  )
}

// Etiqueta arriba del campo (sugerencia de la guía, sección 6).
export function Campo({ id, etiqueta, ayuda, error, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-texto-sec">{ayuda}</p>}
      {error && <MensajeCampo>{error}</MensajeCampo>}
    </div>
  )
}

export function Entrada({ className = '', ...props }) {
  return <input className={`${ESTILO_CAMPO} ${className}`} {...props} />
}

export function Selector({ className = '', ...props }) {
  return <select className={`${ESTILO_CAMPO} ${className}`} {...props} />
}

function MensajeCampo({ children }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-texto" role="alert">
      <IconoEstado tipo="error" />
      {children}
    </p>
  )
}

// Verde, ámbar y rojo nunca como texto pequeño sobre blanco ni solos: recuadro
// del color con texto oscuro, más ícono y palabra (guía 2.5).
const ESTADOS = {
  exito: { fondo: 'bg-exito', icono: '✓', palabra: 'Listo' },
  alerta: { fondo: 'bg-alerta', icono: '!', palabra: 'Atención' },
  error: { fondo: 'bg-error', icono: '✕', palabra: 'Error' },
}

function IconoEstado({ tipo }) {
  const { fondo, icono } = ESTADOS[tipo]
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-5 shrink-0 items-center justify-center text-xs font-bold text-sobre-estado ${fondo}`}
    >
      {icono}
    </span>
  )
}

export function Aviso({ tipo = 'error', children, className = '' }) {
  const { fondo, icono, palabra } = ESTADOS[tipo]
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 px-4 py-3 text-sm text-sobre-estado ${fondo} ${className}`}
    >
      <span aria-hidden="true" className="font-bold">
        {icono}
      </span>
      <p>
        <span className="sr-only">{palabra}: </span>
        {children}
      </p>
    </div>
  )
}

// Estados de la tabla del dashboard (guía, sección 6).
const ESTADOS_TABLA = {
  en_meta: { tipo: 'exito', texto: 'En meta' },
  revisar: { tipo: 'alerta', texto: 'Revisar' },
  fuera_de_meta: { tipo: 'error', texto: 'Fuera de meta' },
}

export function Estado({ estado }) {
  const { tipo, texto } = ESTADOS_TABLA[estado]
  const { fondo, icono } = ESTADOS[tipo]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-sobre-estado ${fondo}`}>
      <span aria-hidden="true">{icono}</span>
      {texto}
    </span>
  )
}

// Variación: verde con ↑ solo si mejora; si empeora, ↓ y rojo (guía 6).
export function Variacion({ porcentaje, sufijo = 'vs. período anterior' }) {
  if (porcentaje === null || porcentaje === undefined || !Number.isFinite(porcentaje)) return null
  const mejora = porcentaje >= 0
  const valor = Math.abs(porcentaje).toLocaleString('es-CO', { maximumFractionDigits: 1 })
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-texto-sec">
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-bold text-sobre-estado ${mejora ? 'bg-exito' : 'bg-error'}`}>
        <span aria-hidden="true">{mejora ? '↑' : '↓'}</span>
        <span className="sr-only">{mejora ? 'Sube' : 'Baja'}</span>
        {valor} %
      </span>
      {sufijo}
    </p>
  )
}

// Tarjeta de cifra (KPI): etiqueta en mayúsculas Inter Bold, cifra en
// Montserrat Bold del color principal.
export function Kpi({ etiqueta, valor, compacto = false, children }) {
  const tamano = compacto ? 'text-xl sm:text-2xl' : 'text-4xl sm:text-5xl'
  return (
    <Tarjeta className={compacto ? 'p-4' : 'p-5 sm:p-6'}>
      <p className="text-xs font-bold uppercase tracking-wide text-texto-sec">{etiqueta}</p>
      <p className={`mt-2 break-words font-display font-bold leading-none text-principal ${tamano}`}>{valor}</p>
      {children}
    </Tarjeta>
  )
}

// Para cargas, una barra cian — nunca el anillo girando (guía, sección 4).
export function BarraCarga({ etiqueta = 'Cargando…' }) {
  return (
    <div role="status" className="py-2">
      <div className="h-1 w-full overflow-hidden bg-borde">
        <div className="barra-carga h-full w-2/5 bg-cian" />
      </div>
      <p className="mt-2 text-sm text-texto-sec">{etiqueta}</p>
    </div>
  )
}

// Tabla: filas alternadas tarjeta / Blanco Hueso, sin líneas verticales,
// texto a la izquierda y cifras a la derecha (guía, sección 6). En pantallas
// angostas se desplaza dentro de su tarjeta, nunca la página entera.
export function Tabla({ children, etiqueta }) {
  return (
    <div className="overflow-x-auto border border-borde bg-tarjeta" role="region" aria-label={etiqueta} tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({ numero = false, children, className = '' }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-borde px-4 py-3 text-xs font-bold uppercase tracking-wide text-texto-sec ${numero ? 'text-right' : ''} ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({ numero = false, children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-texto ${numero ? 'whitespace-nowrap text-right tabular-nums' : ''} ${className}`}>
      {children}
    </td>
  )
}

export function Fila({ children }) {
  return <tr className="odd:bg-tarjeta even:bg-fila-alterna">{children}</tr>
}
