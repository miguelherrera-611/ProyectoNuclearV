// Guía paso a paso del software: solo secciones con flujo real (qué hace
// cada pronóstico, papelera, auditoría, permisos...), no bobadas de interfaz
// (perfil, modo claro/oscuro). "permiso" filtra el paso si el usuario no
// tiene ese permiso (igual que el Sidebar); "selectores" se intentan en
// orden — sirve para apuntar a la versión visible (móvil o escritorio) de
// una misma sección.
export const PASOS = [
  {
    ruta: '/',
    selectores: ['[data-tour="inicio-resumen"]'],
    titulo: 'Pronóstico automático de cada producto',
    descripcion:
      'Por cada producto, el sistema calcula los 4 métodos disponibles y te muestra aquí el que tiene menor error (MAD). "En meta" significa que la señal de rastreo está dentro de ±4; si dice "Revisar", el pronóstico se está desviando y conviene recalcularlo en Pronóstico con otro método o parámetros.',
  },
  {
    ruta: '/',
    selectores: ['[data-tour="inicio-grafico"]'],
    titulo: 'Demanda histórica',
    descripcion:
      'Demanda real mensual de los últimos 24 meses por producto, para detectar tendencias o estacionalidad antes de elegir un método de pronóstico.',
  },
  {
    ruta: '/',
    selectores: ['[data-tour="inicio-tabla-desktop"]', '[data-tour="inicio-tabla-movil"]'],
    titulo: 'Pronóstico del próximo mes',
    descripcion:
      'Para cada producto: el mes proyectado, cuántas unidades y con qué método se calculó. El color del punto es el mismo que usan los gráficos para identificar ese producto.',
  },
  {
    ruta: '/',
    selectores: ['[data-tour="inicio-acciones"]'],
    titulo: 'Ir más a fondo o exportar',
    descripcion:
      '"Generar pronóstico" te lleva a elegir tú mismo el producto, el método y sus parámetros. "Exportar reporte" genera una versión imprimible de este panel.',
  },
  {
    ruta: '/productos',
    permiso: 'productos.crear',
    selectores: ['[data-tour="productos-crear"]'],
    titulo: 'Agregar un producto',
    descripcion:
      'Código y nombre son los únicos datos necesarios. Una vez creado, el siguiente paso es capturar su demanda mensual desde "Ver datos".',
  },
  {
    ruta: '/productos',
    selectores: ['[data-tour="productos-buscador"]'],
    titulo: 'Buscar en el catálogo',
    descripcion: 'Filtra la lista por código o nombre — útil cuando hay muchos productos.',
  },
  {
    ruta: '/productos',
    selectores: ['[data-tour="productos-tabla-desktop"]', '[data-tour="productos-tabla-movil"]'],
    titulo: 'Histórico y eliminar',
    descripcion:
      '"Ver datos" abre el histórico mensual de ese producto: ahí se captura o corrige la cantidad mes a mes, y desde ahí mismo se puede lanzar un pronóstico con esos datos. "Eliminar" no borra nada de inmediato: el producto pasa a la Papelera, recuperable hasta por 30 días.',
  },
  {
    ruta: '/pronostico',
    selectores: ['[data-tour="pronostico-seleccion"]'],
    titulo: 'Elige producto y método',
    descripcion:
      'Cada método tiene su propia lógica: Promedio móvil simple (promedia los últimos n meses), Promedio móvil ponderado (igual, pero tú decides qué tanto pesa cada mes), Suavizamiento exponencial (un solo parámetro α: qué tanto caso le hace al dato más reciente), Suavización con tendencia — Holt (igual, pero además sigue si la demanda sube o baja, con β), Regresión lineal (ajusta una línea de tendencia sin parámetros) y Estacional multiplicativo (para productos con un patrón que se repite cada año). Al elegir un método, los campos que necesita aparecen abajo con su propia ayuda.',
  },
  {
    ruta: '/pronostico',
    selectores: ['[data-tour="pronostico-calcular"]'],
    titulo: 'Calcular',
    descripcion: 'Corre el método elegido sobre el histórico real del producto y lo compara mes a mes con lo que de verdad pasó.',
  },
  {
    ruta: '/pronostico',
    selectores: ['[data-tour="pronostico-resultados"]'],
    titulo: 'Qué significan las métricas',
    descripcion:
      'MAD: error promedio en unidades. MSE: lo mismo, pero penaliza más los errores grandes. MAPE: el error como porcentaje de la demanda. RSFE y Señal de rastreo: si el pronóstico viene sesgado sistemáticamente por arriba o por abajo — fuera de ±4 es señal de que el método ya no sirve para ese producto.',
  },
  {
    ruta: '/pronostico',
    selectores: ['[data-tour="pronostico-detalle"]'],
    titulo: 'Real vs. pronóstico, mes a mes',
    descripcion:
      'El gráfico compara la demanda real con la proyectada; la tabla de abajo muestra el detalle de cada periodo: demanda (D), pronóstico (F), error (E) y sus variantes, usadas para calcular las métricas de arriba.',
  },
  {
    ruta: '/usuarios',
    permiso: 'usuarios.ver',
    selectores: ['[data-tour="usuarios-tabla-desktop"]', '[data-tour="usuarios-tabla-movil"]'],
    titulo: 'Cuentas con acceso',
    descripcion:
      'Lista de quién tiene cuenta, su rol y desde cuándo. "Editar" deja cambiar nombre, correo, contraseña, rol o permisos; "Eliminar" (no disponible sobre tu propia cuenta) la manda a la Papelera y cierra su sesión si la tenía abierta.',
  },
  {
    ruta: '/usuarios',
    permiso: 'usuarios.crear',
    selectores: ['[data-tour="usuarios-crear"]'],
    titulo: 'Crear una cuenta',
    descripcion:
      'Al elegir un rol se marcan automáticamente sus permisos por defecto (Administrador: todos; Gerente: solo calcular pronóstico). Puedes agregar o quitar permisos puntuales para esa persona sin afectar a nadie más — los permisos son por usuario, no por rol.',
  },
  {
    ruta: '/papelera',
    permiso: 'papelera.ver',
    selectores: ['[data-tour="papelera-tabla"]'],
    titulo: 'Lo que se eliminó',
    descripcion:
      'Todo lo que se elimina en Productos, Observaciones y Usuarios aparece aquí, con cuántos días le quedan antes de borrarse solo (30 días). "Restaurar" (verde) lo devuelve a donde estaba, sin pedir nada más. "Eliminar para siempre" (rojo) es irreversible y por eso pide tu contraseña como confirmación.',
  },
  {
    ruta: '/auditoria',
    permiso: 'auditoria.ver',
    selectores: ['[data-tour="auditoria-tabla"]'],
    titulo: 'Quién hizo qué',
    descripcion:
      'Registra automáticamente cada acción administrativa (crear, editar, eliminar, restaurar, eliminar para siempre) sobre Productos, Observaciones y Usuarios: quién la hizo y cuándo. La purga automática de la papelera también queda registrada aquí, a nombre del sistema.',
  },
  {
    ruta: '/auditoria',
    permiso: 'auditoria.ver',
    selectores: ['[data-tour="auditoria-filtros"]'],
    titulo: 'Filtrar la auditoría',
    descripcion: 'Por tipo de registro, por acción o buscando texto en la descripción — útil para rastrear un cambio puntual sin revisar todo el historial.',
  },
]
