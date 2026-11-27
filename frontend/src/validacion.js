// Validaciones de formato compartidas entre formularios — un solo criterio
// de "correo válido" en vez de repetir la expresión regular en cada página.
// Los límites de longitud (maxLength en cada <Entrada>) y los backends ya
// hacen la validación real; esto es la comprobación de formato que los
// campos con noValidate (pantallas de acceso) no reciben gratis del
// navegador.
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function esCorreoValido(valor) {
  return PATRON_CORREO.test(valor.trim())
}
