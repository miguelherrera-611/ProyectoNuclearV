# Informe de Defectos del Ciclo de Desarrollo — Entregable E2.2

> Borrador con datos reales del proyecto. Pegar en `Plantilla_E2.2_ESTUDIANTES_EN_BLANCO_Informe_de_Defectos.docx`,
> completar lo que falta entre `[...]` y exportar como PDF con el nombre `PS_Equipo[N]_C2_InformeDefectos.pdf`.
> Fuente de datos: `PS_Equipo[N]_C2_RegistroDefectos.xlsx` (hoja Registro, **1 defecto** — ver nota honesta abajo).

**Equipo:** [N.º de equipo] · 5 integrantes — [completar nombres]
**Versión del informe:** 1.0 (Corte 2)
**Fecha de entrega:** Viernes 13/11/2026
**Docente:** Jose Alfredo Ramírez Espinosa

## Control de cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0 | 2026-11-20 | [Equipo] | Versión inicial del informe (Corte 2) |

## Nota honesta sobre el alcance de esta ronda

Esta ronda de pruebas (revisión manual dirigida de `Modules/Auth`, `Modules/Productos`, `Modules/Pronosticos` y el frontend, más la batería automatizada existente) encontró y confirmó **un solo defecto funcional real**, que ya se corrigió y se cubrió con una prueba de regresión. No se infló el registro con hallazgos fabricados para llegar a un número arbitrario: el resto del código revisado (autenticación con 2FA, límite de intentos, expiración de código, autorización por rol, rutas protegidas, algoritmos de pronóstico) se sostuvo bien bajo trazado línea por línea y casos límite. Esto es consistente con que buena parte de la lógica de cálculo ya se desarrolló comparando directamente contra los Excel del cliente. La sección 3 presenta ese único defecto con la cadena completa pedida por la plantilla; no se fuerzan "tres defectos relevantes" donde solo hay uno verificado.

## 1. Resumen por módulo y severidad

| Módulo | Defectos |
|---|---|
| Pronóstico | 1 |
| Gestión de datos | 0 |
| Indicadores y reportes | 0 |
| Autenticación y roles | 0 |
| Transversal | 0 |
| **Total** | **1** |

| Severidad | Defectos | Estado al corte |
|---|---|---|
| Crítica | 0 | — |
| Alta | 1 | 1 Corregido (pendiente de verificación independiente por el equipo) |
| Media | 0 | — |
| Baja | 0 | — |

## 2. Análisis de agrupación

Con un solo defecto no hay base estadística para hablar de "agrupación" en el sentido del principio de Pareto de defectos. Lo que sí es significativo: el único defecto encontrado está en el módulo de **Pronóstico**, específicamente en el método más complejo del motor de cálculo (estacional multiplicativo, el único que combina agrupación por año, extrapolación de meses faltantes, índices estacionales y proyección a futuro en una sola función). Los métodos más simples (promedio móvil, suavizamiento exponencial, regresión lineal) no mostraron defectos bajo la misma revisión.

**Recomendación para el Corte 3:** al añadir el método de pronóstico P5/P6 mencionado en el código (`PronosticoController`), priorizar pruebas de casos límite con series en declive — es exactamente el patrón que produjo DEF-001 — antes de dar por buena la implementación. Comparar también con la matriz de riesgos del plan maestro si el equipo la tiene fuera del repositorio: no se encontró un plan maestro versionado en `/docs` para contrastar.

## 3. Defecto relevante

### DEF-001 · El pronóstico estacional multiplicativo puede proyectar demanda negativa (Alta, P1)

| Elemento | Descripción |
|---|---|
| **Error** | Al programar la proyección del año siguiente, el desarrollador calculó `total_proyectado = total_del_último_año + incremento_promedio` sin considerar que `incremento_promedio` puede ser más negativo (en magnitud) que el propio total del último año — a diferencia de los años históricos, que sí tienen una validación explícita (`if ($promedio <= 0) throw ...`), la proyección a futuro no tenía ninguna. |
| **Defecto** | `Modules/Pronosticos/EstacionalMultiplicativo.php`, línea 40 (antes del fix): `$totalProyectado = $totales[$ultimoAnio] + $incrementoPromedio;` sin piso en cero. |
| **Falla** | Con un histórico donde el último año cae fuertemente frente al anterior, el sistema devuelve pronósticos negativos para los 12 meses del año proyectado (ej. -900 unidades), una demanda físicamente imposible, sin ninguna validación ni aviso al usuario. Reproducido de forma determinística: 12 meses de 2024 con demanda ≈1000 u/mes + enero de 2025 con una caída a 50 u → `incremento_promedio = -11.476`, `total_proyectado = -10.872`, pronóstico de enero de 2026 = **-900 u**. |
| **Causa raíz** | No existía una prueba de verificación numérica para el caso "el último año cae respecto al anterior" — todas las pruebas existentes usaban históricos estables o crecientes (los mismos que trae el Excel del cliente), así que el camino de caída fuerte nunca se ejecutó hasta esta revisión dirigida. |

**Corrección aplicada:** se agregó un piso de cero (`max(0.0, ...)`) al total proyectado en `EstacionalMultiplicativo.php`, consistente con que la demanda nunca puede ser negativa. Se añadió la prueba de regresión `EstacionalMultiplicativoTest::no_proyecta_demanda_negativa_cuando_el_ultimo_anio_cae_fuerte_frente_al_anterior` (pasa junto con las otras 18 pruebas de esa clase). Pendiente: que alguien del equipo revise el fix y lo marque `Verificado`/`Cerrado` en el registro (quedó en `Corregido`).

## 4. Recomendaciones al equipo de desarrollo

- **Agregar casos de prueba con series en declive** a la batería de `EstacionalMultiplicativo` (y a cualquier método de pronóstico futuro): todos los fixtures actuales vienen de Excel con demanda estable o creciente, así que el camino "el negocio va mal" nunca se ejercitó. Esto fue la causa raíz de DEF-001.
- **Instalar análisis estático de tipos (Larastan/PHPStan)** antes del Corte 3 — no se pudo en este corte por un bloqueo local de antivirus (ver Informe de Cobertura, Sección 1), pero habría podido señalar la falta de un chequeo de rango en `$totalProyectado`.
- **Escribir pruebas de componente para el frontend del dashboard** (`Dashboard.jsx`, `ResultadoEstacional.jsx`): aunque no se encontró un defecto funcional ahí en esta ronda, esas vistas renderizan directamente lo que el backend devuelve — si el backend vuelve a fallar de forma similar a DEF-001, nada en el frontend lo detectaría antes de llegar a producción.
- **Versionar el catálogo de casos de prueba (CP-xxx) y la matriz de riesgos del Corte 1 dentro del repositorio** (`/docs`): no se encontraron en este repositorio, lo que obligó a improvisar IDs descriptivos en el Informe de Cobertura. Tenerlos en el repo evita que el análisis de agrupación de esta sección dependa de documentos externos.
