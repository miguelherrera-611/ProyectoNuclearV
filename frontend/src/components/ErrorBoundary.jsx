import { Component } from 'react'
import { Aviso, Boton } from './ui'

// Sin esto, un error de JS en CUALQUIER pantalla tumba toda la app a una
// página en blanco (sidebar y navbar incluidos) — con esto, solo se pierde
// el contenido de esa pantalla y el usuario puede seguir navegando.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error en la pantalla:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <Aviso className="mb-4">Algo salió mal mostrando esta pantalla.</Aviso>
          <Boton variante="secundario" onClick={() => this.setState({ error: null })}>
            Reintentar
          </Boton>
        </div>
      )
    }

    return this.props.children
  }
}
