import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import BarraFiltros from '../components/BarraFiltros'
import ConfirmacionEliminar from '../components/ConfirmacionEliminar'
import Paginador from '../components/Paginador'
import { Aviso, BarraCarga, Boton, Campo, Entrada, Fila, Tabla, Tarjeta, Td, Th, Titulo } from '../components/ui'
import { usePaginacion } from '../components/usePaginacion'
import { colorDeProducto } from '../tema/colores'
import { useTema } from '../tema/TemaContext'

export default function ProductosPage() {
  const { token, user } = useAuth()
  const { tema } = useTema()
  const puedeCrear = user?.permisos?.includes('productos.crear')
  const puedeEliminar = user?.permisos?.includes('productos.eliminar')

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const termino = busqueda.trim().toLowerCase()
  const productosFiltrados = termino
    ? productos.filter((p) => p.nombre.toLowerCase().includes(termino) || p.codigo.toLowerCase().includes(termino))
    : productos

  const pag = usePaginacion(productosFiltrados.length, 10, busqueda)

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cargarProductos() {
    setCargando(true)
    try {
      const data = await api.productos.listar(token)
      setProductos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCrear(event) {
    event.preventDefault()
    setErrorForm('')
    setExito('')

    if (!codigo || !nombre) {
      setErrorForm('Completa código y nombre.')
      return
    }

    setEnviando(true)
    try {
      await api.productos.crear(token, { codigo, nombre })
      setCodigo('')
      setNombre('')
      await cargarProductos()
      setExito('Producto agregado.')
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const [productoAEliminar, setProductoAEliminar] = useState(null)

  // El producto no desaparece de verdad: queda en la papelera, restaurable
  // hasta por 30 días (Modules\Auth\PapeleraController).
  async function confirmarEliminar() {
    const producto = productoAEliminar
    setProductoAEliminar(null)
    setError('')
    try {
      await api.productos.eliminar(token, producto.id)
      await cargarProductos()
      setExito(`"${producto.nombre}" se eliminó y quedó en la papelera.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <Titulo subtitulo="Catálogo de productos y acceso a su histórico de demanda.">Productos</Titulo>

      {error && <Aviso className="mb-6">{error}</Aviso>}
      {exito && <Aviso tipo="exito" className="mb-6">{exito}</Aviso>}

      {puedeCrear && (
        <Tarjeta data-tour="productos-crear" className="mb-6 p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Nuevo producto</h2>
          <form onSubmit={handleCrear} className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
            <Campo id="codigo" etiqueta="Código">
              <Entrada id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </Campo>
            <Campo id="nombre" etiqueta="Nombre">
              <Entrada id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
            <Boton type="submit" disabled={enviando} className="w-full sm:w-auto">
              {enviando ? 'Agregando…' : 'Agregar producto'}
            </Boton>
          </form>
          {errorForm && <Aviso className="mt-4">{errorForm}</Aviso>}
        </Tarjeta>
      )}

      {cargando && <BarraCarga etiqueta="Cargando productos…" />}

      {!cargando && productos.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">No hay productos todavía.</Tarjeta>
      )}

      {!cargando && productos.length > 0 && (
        <div data-tour="productos-buscador">
          <BarraFiltros busqueda={busqueda} onBusqueda={setBusqueda} placeholderBusqueda="Buscar por código o nombre…" />
        </div>
      )}

      {!cargando && productos.length > 0 && productosFiltrados.length === 0 && (
        <Tarjeta className="p-6 text-texto-sec">Ningún producto coincide con "{busqueda}".</Tarjeta>
      )}

      {!cargando && productosFiltrados.length > 0 && (
        <>
          {/* Celular: una tarjeta por producto. */}
          <ul data-tour="productos-tabla-movil" className="grid gap-3 md:hidden">
            {pag.slice(productosFiltrados).map((producto) => (
              <li key={producto.id}>
                <Tarjeta className="p-4">
                  <div className="flex items-start gap-3">
                    <MarcaProducto color={colorDeProducto(productos, producto.id, tema)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{producto.nombre}</p>
                      <p className="mt-1 text-sm text-texto-sec">{producto.codigo}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to={`/productos/${producto.id}/datos`}
                      className="inline-flex min-h-11 items-center border border-campo px-4 font-display text-sm font-bold text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                    >
                      Ver datos
                    </Link>
                    {puedeEliminar && (
                      <Boton variante="destructivo" onClick={() => setProductoAEliminar(producto)}>
                        Eliminar
                      </Boton>
                    )}
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-borde bg-tarjeta shadow-md md:hidden">
            <Paginador {...pag} onCambiar={pag.setPagina} />
          </div>

          {/* Tableta y escritorio: tabla. */}
          <div data-tour="productos-tabla-desktop" className="hidden md:block">
            <Tabla etiqueta="Productos" pie={<Paginador {...pag} onCambiar={pag.setPagina} />}>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Código</Th>
                  <Th>Datos históricos</Th>
                  {puedeEliminar && <Th>Acciones</Th>}
                </tr>
              </thead>
              <tbody>
                {pag.slice(productosFiltrados).map((producto) => (
                  <Fila key={producto.id}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <MarcaProducto color={colorDeProducto(productos, producto.id, tema)} />
                        {producto.nombre}
                      </span>
                    </Td>
                    <Td className="text-texto-sec">{producto.codigo}</Td>
                    <Td>
                      <Link
                        to={`/productos/${producto.id}/datos`}
                        className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                      >
                        Ver datos
                      </Link>
                    </Td>
                    {puedeEliminar && (
                      <Td>
                        <Boton
                          variante="destructivo"
                          className="min-h-0 px-0 py-0"
                          onClick={() => setProductoAEliminar(producto)}
                        >
                          Eliminar
                        </Boton>
                      </Td>
                    )}
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}

      {productoAEliminar && (
        <ConfirmacionEliminar
          titulo={`¿Eliminar ${productoAEliminar.nombre}?`}
          mensaje={`Se eliminará el producto ${productoAEliminar.codigo}.`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setProductoAEliminar(null)}
        />
      )}
    </div>
  )
}

// El color del producto en la lista es el mismo que en los gráficos (guía 5).
function MarcaProducto({ color }) {
  return <span aria-hidden="true" className="mt-1 inline-block size-3 shrink-0" style={{ backgroundColor: color }} />
}
