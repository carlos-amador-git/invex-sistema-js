// Configuración de roles y permisos del sistema
export const ROLES_CONFIG = {
  admin: {
    nombre: 'Admin de Inventario',
    area: 'Inventario',
    color: '#8b5cf6',
    modulos: ['dashboard', 'balance', 'forecast', 'productos', 'ordenes', 'usuarios', 'configuracion'],
    permisos: {
      verTodo: true,
      editarTodo: true,
      crearOrdenes: true,
      gestionarUsuarios: true
    }
  },
  tsys: {
    nombre: 'Usuario TSYS',
    area: 'Almacén (TSYS)',
    color: '#3b82f6',
    modulos: ['captura-tsys', 'mi-historial', 'dashboard-lectura'],
    permisos: {
      verTodo: false,
      editarInventarioTSYS: true,
      verDashboard: true
    }
  },
  distribucion: {
    nombre: 'Usuario Distribución',
    area: 'Distribución',
    color: '#f59e0b',
    modulos: ['captura-distribucion', 'mi-historial', 'dashboard-lectura'],
    permisos: {
      verTodo: false,
      editarDemandaDistribucion: true,
      verDashboard: true
    }
  },
  modulos: {
    nombre: 'Usuario Módulos',
    area: 'Módulos',
    color: '#10b981',
    modulos: ['captura-modulos', 'mi-historial', 'dashboard-lectura'],
    permisos: {
      verTodo: false,
      editarDemandaModulos: true,
      verDashboard: true
    }
  },
  consulta: {
    nombre: 'Consulta / Directivo',
    area: 'Dirección',
    color: '#64748b',
    modulos: ['dashboard-lectura'],
    permisos: {
      verTodo: false,
      verDashboard: true,
      soloLectura: true
    }
  }
};

export default ROLES_CONFIG;
