// Círculo con la foto de perfil si hay (avatar_url, Modules\Auth\
// UserResource), o las iniciales del nombre si no — mismo criterio en todos
// los lugares que muestran a un usuario (barra superior, Usuarios).
function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

export default function Avatar({ nombre, url, tamano = 'size-9' }) {
  if (url) {
    return <img src={url} alt="" className={`${tamano} shrink-0 rounded-full object-cover`} />
  }

  return (
    <span
      className={`flex ${tamano} shrink-0 items-center justify-center rounded-full bg-principal font-display text-sm font-bold text-sobre-principal`}
    >
      {iniciales(nombre)}
    </span>
  )
}
