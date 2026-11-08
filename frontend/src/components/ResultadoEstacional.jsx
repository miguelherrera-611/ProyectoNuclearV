import GraficoLineas from './GraficoLineas'
import { Fila, Kpi, Tabla, Tarjeta, Td, Th } from './ui'
import { formatearNumero, formatearPeriodo, formatearPorcentaje, formatearUnidades } from '../format'

export default function ResultadoEstacional({ resultado, producto, colorProducto }) {
  const { filas, metricas, estacional } = resultado
  const proyecciones = filas.filter((fila) => Number(fila.periodo.slice(0, 4)) === estacional.anio_proyectado)
  const historico = filas.filter((fila) => Number(fila.periodo.slice(0, 4)) < estacional.anio_proyectado)
  const contieneEstimaciones = historico.some((fila) => fila.demanda_estimada !== undefined)
  const datosGrafico = filas.map((fila) => ({
    periodo: formatearPeriodo(fila.periodo),
    real: fila.real,
    estimada: fila.demanda_estimada ?? null,
    pronostico: fila.pronostico,
  }))

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Kpi etiqueta={`Proyección anual ${estacional.anio_proyectado}`} valor={formatearUnidades(estacional.total_proyectado, 2)}>
          <p className="mt-3 text-sm text-texto-sec">
            Incremento anual promedio: {formatearUnidades(estacional.incremento_promedio, 2)}.
            {' '}El total se calcula antes de redondear las proyecciones mensuales.
          </p>
        </Kpi>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          <Kpi compacto etiqueta="MAD" valor={formatearUnidades(metricas.mad, 2)} />
          <Kpi compacto etiqueta="MSE" valor={formatearNumero(metricas.mse)} />
          <Kpi compacto etiqueta="MAPE" valor={formatearPorcentaje(metricas.mape)} />
          <Kpi compacto etiqueta="RSFE" valor={formatearUnidades(metricas.rsfe, 2)} />
          <Kpi compacto etiqueta="Señal de rastreo" valor={formatearNumero(metricas.senal_rastreo)} />
          <Kpi compacto etiqueta="Periodos evaluados" valor={metricas.n_periodos_evaluados} />
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Pronóstico mensual de {estacional.anio_proyectado}</h2>
      <Tabla etiqueta="Pronóstico estacional del próximo año">
        <thead>
          <tr>
            <Th>Periodo</Th>
            <Th numero>Índice estacional promedio</Th>
            <Th numero>Pronóstico</Th>
          </tr>
        </thead>
        <tbody>
          {proyecciones.map((fila, indice) => (
            <Fila key={fila.periodo}>
              <Td>{formatearPeriodo(fila.periodo)}</Td>
              <Td numero>{formatearNumero(estacional.indices[indice], 6)}</Td>
              <Td numero>{formatearUnidades(fila.pronostico)}</Td>
            </Fila>
          ))}
        </tbody>
      </Tabla>

      <Tarjeta className="my-6 p-3 sm:p-6">
        <h2 className="mb-1 px-1 font-display text-lg font-bold">Demanda y pronóstico estacional</h2>
        <p className="mb-4 px-1 text-sm text-texto-sec">
          {producto?.nombre} · Datos reales hasta {formatearPeriodo(estacional.ultimo_periodo_real)}.
        </p>
        <GraficoLineas
          descripcion={`Demanda y pronóstico estacional de ${producto?.nombre ?? 'el producto'}`}
          datos={datosGrafico}
          series={[
            { clave: 'real', nombre: 'Demanda real', etiqueta: 'Real', color: colorProducto },
            ...(contieneEstimaciones
              ? [{ clave: 'estimada', nombre: 'Cierre estimado', etiqueta: 'Estimado', color: colorProducto, discontinua: true }]
              : []),
            { clave: 'pronostico', nombre: 'Pronóstico estacional', etiqueta: 'Pronóstico', color: colorProducto, discontinua: true },
          ]}
        />
      </Tarjeta>

      <h2 className="mb-3 font-display text-lg font-bold">Evaluación del histórico</h2>
      {contieneEstimaciones && (
        <p className="mb-4 text-sm text-texto-sec">
          Los meses marcados como «Estimado» completan el último año con el crecimiento acumulado frente al año anterior.
          Se incluyen en las métricas, igual que en el Excel, y no se guardan como ventas reales.
        </p>
      )}
      <Tabla etiqueta="Evaluación del pronóstico estacional por periodo">
        <thead>
          <tr>
            <Th>Periodo</Th>
            <Th>Origen</Th>
            <Th numero>Demanda base</Th>
            <Th numero>Pronóstico</Th>
            <Th numero>E</Th>
            <Th numero>|E|</Th>
            <Th numero>E²</Th>
            <Th numero>|E|/D</Th>
          </tr>
        </thead>
        <tbody>
          {historico.map((fila) => (
            <Fila key={fila.periodo}>
              <Td className="whitespace-nowrap">{formatearPeriodo(fila.periodo)}</Td>
              <Td>{fila.demanda_estimada !== undefined ? 'Estimado' : 'Real'}</Td>
              <Td numero>{formatearUnidades(fila.real ?? fila.demanda_estimada, 2)}</Td>
              <Td numero>{formatearUnidades(fila.pronostico)}</Td>
              <Td numero>{formatearUnidades(fila.error, 2)}</Td>
              <Td numero>{formatearUnidades(fila.error_abs, 2)}</Td>
              <Td numero>{formatearNumero(fila.error_cuadrado)}</Td>
              <Td numero>{formatearPorcentaje(fila.error_relativo !== null ? fila.error_relativo * 100 : null)}</Td>
            </Fila>
          ))}
        </tbody>
      </Tabla>
    </>
  )
}
