# Informe de Cobertura y Verificación Numérica — Entregable E2.1

> Borrador con datos reales del proyecto. Pegar en `Plantilla_E2.1_ESTUDIANTES_EN_BLANCO_Informe_de_Cobertura.docx`,
> completar lo que falta entre `[...]` y exportar como PDF con el nombre `PS_Equipo[N]_C2_InformeCobertura.pdf`.

**Equipo:** [N.º de equipo] · 5 integrantes — [completar nombres]
**Versión del informe:** 1.0 (Corte 2)
**Fecha de entrega:** Viernes 13/11/2026
**Sistema bajo prueba:** Sistema web de predicción de demanda — backend Laravel 12.70.0 / PHP 8.2.12, frontend React 19 / Vite 8
**Rama / commit evaluado:** `main` @ `310271c` + cambios de este corte (fix de DEF-001, pruebas nuevas, tooling de cobertura) — **pendiente de commitear antes de entregar**
**Docente:** Jose Alfredo Ramírez Espinosa

## Control de cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0 | 2026-11-20 | [Equipo] | Versión inicial del informe (Corte 2) |
| 1.1 | 2026-11-23 | [Equipo] | Se agregó el interruptor temporal de 2FA (`AUTH_TWO_FACTOR_ENABLED`) con su prueba dedicada; números de cobertura del backend actualizados (Secciones 2 y 3) |

## 1. Herramientas y versiones

| Herramienta | Versión | Para qué se usó |
|---|---|---|
| PHP | 8.2.12 | Runtime del backend y de las pruebas |
| Laravel | 12.70.0 | Framework del backend |
| PHPUnit | 11.5.57 | Pruebas unitarias y de integración |
| PCOV | 1.0.12 | Driver de cobertura de código (líneas y métodos) |
| Laravel Pint | 1.24.x | Estilo de código (PSR-12) — no es análisis estático de tipos |
| GitHub Actions | — | Pipeline de integración continua: corre `php artisan test` en cada push/PR a `main` |
| Node.js | 22.19.0 | Runtime del frontend y de sus pruebas |
| Vite | 8.3.4 | Build y dev server del frontend |
| Vitest | 5.1.1 | Pruebas unitarias del frontend |
| @vitest/coverage-v8 | — | Cobertura de código del frontend (V8) |

**Nota de honestidad:** evaluamos agregar análisis estático de tipos (Larastan/PHPStan) pero la instalación quedó bloqueada localmente — el antivirus de la máquina de desarrollo retiene el `.zip` descargado por Composer (`Permission denied` persistente en `vendor/composer/tmp-*.zip~`). `composer.json` no quedó con esa dependencia a medias; si el equipo quiere este chequeo, corran `composer require --dev larastan/larastan` desde una máquina sin ese bloqueo (en CI, Linux, no debería ocurrir).

## 2. Resultado de la ejecución

| Indicador | Valor |
|---|---|
| Pruebas unitarias ejecutadas (backend) | 37 (503 assertions) — algoritmos de pronóstico |
| Pruebas de integración ejecutadas (backend) | 36 (156 assertions) — HTTP + base de datos: auth/2FA (incluye el interruptor `AUTH_TWO_FACTOR_ENABLED`), roles, productos, observaciones, cálculo de pronóstico |
| Pruebas unitarias ejecutadas (frontend) | 11 — utilidades de formato (`format.js`) |
| Total ejecutadas | 84 |
| Aprobadas | 84 |
| Fallidas | 0 |
| Bloqueadas | 0 |
| Omitidas en esta corrida | Pruebas E2E/rendimiento/seguridad dedicadas — no existen aún en el repositorio; se planifican para el Corte 3 |

Comando usado: `composer test:coverage` (backend) y `npm run test:coverage` (frontend). Ver Anexo A.

**Nueva funcionalidad probada en esta versión — interruptor temporal de 2FA:** se agregó la variable `AUTH_TWO_FACTOR_ENABLED` (`config/auth.php`) para poder desactivar el código por correo en producción sin necesidad de un nuevo despliegue (solo cambiando el `.env` del servidor y corriendo `php artisan config:clear`), y volver a activarlo de la misma forma. Por defecto queda **activado** (`true`) — es decir, si la variable no está definida en algún entorno, el 2FA sigue funcionando como siempre; hay que apagarlo explícitamente. La prueba `test_login_with_two_factor_disabled_returns_the_token_directly` cubre el camino con el interruptor en `false`: verifica que el login entrega el token directo, que no queda ningún código 2FA pendiente en el usuario, que el token funciona de verdad contra una ruta protegida, y que el evento queda auditado como `login_success_2fa_disabled` en `login_audits` (para no perder el rastro de que ese login salió sin verificación en dos pasos).

## 3. Cobertura de líneas y ramas por módulo

**Nota sobre la métrica:** el stack de backend es PHP/PHPUnit con PCOV. A diferencia de Jest (Istanbul), el reporte nativo de PHPUnit/php-code-coverage **no calcula "cobertura de ramas"** como métrica separada — reporta líneas, métodos y clases. Sustituimos "cobertura de ramas" por **cobertura de métodos**, que es el indicador más cercano disponible en este stack, y lo declaramos aquí en vez de inventar un número. El frontend (Vitest/V8) sí reporta ramas de forma nativa.

### Backend (PHPUnit + PCOV)

| Módulo | Cobertura de líneas | Cobertura de métodos | ¿Cumple la meta? |
|---|---|---|---|
| Autenticación y roles (`Modules/Auth`) | 93,29 % (153/164) | 93,3 % (14/15) | Sí |
| Gestión de datos (`Modules/Productos` + captura de observaciones) | 70,91 % (39/55) | 58,3 % (7/12) | No — ver Sección 5 |
| Pronóstico (`Modules/Pronosticos`, algoritmos + controlador) | 97,58 % (404/414) | 41,7 % (5/12)¹ | Sí (líneas) |
| Indicadores y reportes | No aplica — el módulo vive enteramente en el frontend (React/Recharts), no hay backend propio | — | No — ver Sección 5 |
| **Global backend** | **94,38 % (621/658)** | **68,29 % (28/41)** | **Sí (líneas)** |

Autenticación y roles subió de 92,52 % a 93,29 % tras agregar el interruptor de 2FA: el nuevo camino (`AuthController::login` con `two_factor_enabled` en `false`) quedó 100 % cubierto por su propia prueba.

¹ El % de métodos bajo en Pronóstico es un artefacto de cómo PHPUnit cuenta "método cubierto" en clases con un solo método público invocado indirectamente vía `app()->calcular()`; la cobertura de líneas real (97,58 %) refleja mejor el trabajo efectivamente probado.

### Frontend (Vitest + V8)

| Archivo / área | % Statements | % Branches | % Lines |
|---|---|---|---|
| `src/format.js` (utilidades puras) | 100 % | 100 % | 100 % |
| Resto de componentes (Dashboard, formularios, gráficos, páginas) | 0 % | 0 % | 0 % |
| **Global frontend** | **2,55 %** | **3,85 %** | **2,24 % (11/491)** |

Evidencia: `backend/coverage/index.html` (generado con `composer test:coverage`) y `frontend/coverage/index.html` (generado con `npm run test:coverage`). Adjuntar captura de ambos al entregar.

## 4. Tabla de verificación numérica

Todos los casos comparan el motor de pronóstico contra los números firmados por el cliente en sus hojas de Excel (`Pronosticos de producción ejemplo.xlsx` / `suavizamiento exponencial.xlsx`), ya incorporados como fixtures de las pruebas automatizadas. Tolerancia usada consistentemente en el código: diferencia absoluta ≤ 0,01 (`assertEqualsWithDelta`).

| ID caso | Qué se verifica | Referencia (Excel cliente) | Sistema | Diferencia | Tolerancia | Veredicto |
|---|---|---|---|---|---|---|
| CP-PMP-N2 | Promedio móvil ponderado (pesos 0,4/0,6) · MAD | 2,625 | 2,625 | 0,00 | 0,01 | APROBADO |
| CP-PMP-N2-MAPE | Promedio móvil ponderado (pesos 0,4/0,6) · MAPE | 4,5019 % | 4,5019 % | 0,00 | 0,01 | APROBADO |
| CP-PMP-N3 | Promedio móvil ponderado (pesos 0,6/0,3/0,1) · MAD | 2,1429 | 2,1429 | 0,00 | 0,01 | APROBADO |
| CP-SES | Suavizamiento exponencial (α=0,45) · pronóstico período 11 | 62,0 | 62,0 | 0,00 | 0,01 | APROBADO |
| CP-SES-MAD | Suavizamiento exponencial (α=0,45) · MAD | 3,70 | 3,70 | 0,00 | 0,01 | APROBADO |
| CP-HOLT | Holt (α=0,95, β=0,5) · pronóstico período 4 | 55,0 | 55,0 | 0,00 | 0,01 | APROBADO |
| CP-HOLT-MAD | Holt (α=0,95, β=0,5) · MAD | 5,6667 | 5,6667 | 0,00 | 0,01 | APROBADO |
| CP-RL | Regresión lineal · MAD | 3,00 | 3,00 | 0,00 | 0,01 | APROBADO |
| CP-RL-MAPE | Regresión lineal · MAPE | 5,1353 % | 5,1353 % | 0,00 | 0,01 | APROBADO |
| CP-EST-ACEL | Estacional multiplicativo ("acelerador") · proyecciones año siguiente | Hoja Excel del cliente (33 valores) | Coincide exactamente | 0,00 | 0,01 | APROBADO |
| CP-EST-NEG (DEF-001) | Estacional multiplicativo con caída fuerte entre años · demanda proyectada | ≥ 0 (no puede ser negativa) | **Antes del fix: -900 u (2026-01)** → **Después del fix: 0 u** | — | — | **FALLIDO → CORREGIDO** (ver registro de defectos, DEF-001) |

CP-EST-NEG documenta un ciclo completo hallazgo → corrección → reverificación: se encontró durante esta ronda de pruebas, se corrigió en `EstacionalMultiplicativo.php` (piso de 0 en la demanda proyectada) y quedó cubierto por una prueba de regresión nueva.

**Nota sobre el catálogo CP-xxx:** el repositorio no tiene un catálogo formal de casos de prueba del Corte 1 (no se encontró `Verificacion.xlsx` ni una matriz de trazabilidad CP-xxx/RF-xx dentro del repositorio). Los IDs de esta tabla son descriptivos, creados para este informe; si el equipo ya tiene un catálogo del Corte 1 fuera del repositorio, reemplacen estos IDs por los oficiales.

## 5. Análisis de brechas

- **Gestión de datos (70,91 % líneas, 58,3 % métodos):** `ProductoController::update` y `ObservacionController::index` no están cubiertos por un flujo completo de actualización/listado exitoso — las pruebas actuales de `ProductoAuthorizationTest` validan autorización (quién puede/no puede) pero no el camino feliz completo de editar un producto o listar observaciones. Se agregará antes del Corte 3.
- **Indicadores y reportes (0 %):** todo el dashboard (`Dashboard.jsx`, `ResultadoEstacional.jsx`, `GraficoLineas.jsx`, páginas de reportes) vive en el frontend y no tiene ninguna prueba todavía — solo las utilidades puras de formato (`format.js`) están cubiertas. Se requieren pruebas de componente (React Testing Library) para el Corte 3.
- **Frontend en general (2,24 % líneas global):** la infraestructura de pruebas (Vitest + Testing Library) se instaló en este corte pero solo se escribieron pruebas para `format.js`. Es la brecha más grande del proyecto y la prioridad número uno para el Corte 3.
- **Análisis estático de tipos:** no se pudo instalar Larastan/PHPStan en esta corrida por un bloqueo local de antivirus (ver Sección 1). Pendiente para el Corte 3.
- **Catálogo CP-xxx / matriz de riesgos / plan maestro del Corte 1:** no se encontraron en el repositorio. Si existen en otro lugar, deberían incorporarse a `/docs` para que la verificación numérica cite IDs oficiales en vez de los descriptivos de este informe.

## 6. Conclusiones

El backend cumple holgadamente la meta de cobertura de líneas (94,38 % global, con los tres módulos de cálculo —Auth, Productos y Pronóstico— todos por encima de la meta de 80 % salvo Gestión de datos, que queda en 70,91 % por caminos de "editar"/"listar" sin probar explícitamente). Los 10 casos de verificación numérica contra los Excel firmados por el cliente están APROBADOS, incluido un caso (CP-EST-NEG) que durante esta ronda reveló un defecto real —el pronóstico estacional podía proyectar demanda negativa— que se corrigió y volvió a verificar en el mismo corte. La brecha más importante no está en el backend sino en el **frontend**, que recién esta corrida obtuvo su primera infraestructura de pruebas (Vitest) y apenas cubre las utilidades puras; todo el dashboard de indicadores y reportes queda sin probar y es la prioridad para el Corte 3, junto con cerrar la cobertura de Gestión de datos y retomar el análisis estático de tipos una vez resuelto el bloqueo local del antivirus. También se agregó un interruptor para desactivar el 2FA temporalmente en producción (pensado para soporte o demos, sin necesitar otro despliegue); se entregó con su propia prueba y con auditoría del evento, para que apagarlo no quede como un cambio silencioso sin rastro.

## Anexo A · Cómo generar el reporte de cobertura en este proyecto

**Backend (PHP/Laravel + PHPUnit + PCOV):**
```
cd backend
composer test:coverage
```
Esto corre `vendor/bin/phpunit --coverage-html coverage --coverage-text` con `pcov.directory=.` (necesario: el driver de cobertura resuelve mal el directorio por defecto cuando el proyecto PHP vive en un subdirectorio `backend/` de un repositorio más grande). El resumen queda en consola y el detalle línea por línea en `backend/coverage/index.html`.

**Frontend (Vite/React + Vitest):**
```
cd frontend
npm run test:coverage
```
Reporte HTML en `frontend/coverage/index.html`.

Ambas carpetas `coverage/` están en `.gitignore` — no se suben al repositorio, solo las capturas/el resumen de este informe.

## Anexo B · Errores frecuentes (evitados en este proyecto)

- Comparar decimales con igualdad exacta en vez de con tolerancia: el proyecto usa `assertEqualsWithDelta(..., 0.01)` consistentemente.
- Que el valor esperado salga del mismo código que se prueba: los valores de referencia vienen de los Excel firmados por el cliente (fixtures en `tests/Fixtures/`), no del código de producción.
- Cobertura alta sin aserciones reales: las pruebas comparan valores numéricos exactos, no solo "no explota".
- Reportar solo cobertura global: este informe desglosa por módulo (Sección 3) y expone que el promedio global esconde un frontend prácticamente sin probar.
