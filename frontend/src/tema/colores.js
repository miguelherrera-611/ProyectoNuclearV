// Colores de los gráficos según la guía de identidad (sección 5). Recharts
// dibuja en SVG con atributos, donde las variables CSS no son confiables, así
// que estos valores van en JS y se eligen según el tema activo.

// "Color constante por producto": el producto A siempre es el mismo color en
// gráficos, leyendas y tablas, sin importar el orden ni los filtros. La guía
// define 3 series; un 4.º producto repetiría color, así que habría que pedir
// al cliente más colores antes de agregarlo.
const COLORES_PRODUCTO = {
  claro: ['#303b8f', '#8e9196', '#32b77a'],
  oscuro: ['#24d9e8', '#4f6cff', '#b7f34a'],
}

// Ejes y rejilla en Gris Acero, finos y solo horizontales.
export const COLOR_EJE = '#8e9196'

export const COLORES_TEXTO = {
  claro: { texto: '#161a25', secundario: '#687083', tarjeta: '#ffffff', borde: '#c9cbd2' },
  oscuro: { texto: '#ffffff', secundario: '#9aa2b4', tarjeta: '#181d2b', borde: '#30364a' },
}

// El color sale de la posición del producto ordenado por id (el orden de
// alta), nunca de su posición en una lista filtrada.
export function colorDeProducto(productos, productoId, tema) {
  const ids = productos.map((p) => p.id).sort((a, b) => a - b)
  const posicion = Math.max(0, ids.indexOf(Number(productoId)))
  const paleta = COLORES_PRODUCTO[tema]
  return paleta[posicion % paleta.length]
}
