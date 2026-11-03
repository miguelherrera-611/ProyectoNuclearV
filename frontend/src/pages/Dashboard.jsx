import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Bienvenido, {user?.name}</h1>
      <p className="mb-8 text-slate-500">
        Rol: <span className="capitalize">{user?.role}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/productos"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Productos</h2>
          <p className="text-sm text-slate-500">Ver el catálogo y capturar datos históricos de demanda.</p>
        </Link>

        <Link
          to="/pronostico"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Pronóstico</h2>
          <p className="text-sm text-slate-500">
            Calcular el promedio móvil simple sobre el histórico de un producto.
          </p>
        </Link>
      </div>
    </div>
  )
}
