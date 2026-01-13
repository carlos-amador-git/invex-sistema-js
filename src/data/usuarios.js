// Base de datos de usuarios del sistema
// En producción, esto vendría de una API/Backend

export const USUARIOS_INICIAL = [
  { 
    id: 1, 
    username: 'admin', 
    password: 'admin123', 
    nombre: 'Carlos Mendoza', 
    email: 'carlos.mendoza@banco.com',
    rol: 'admin', 
    faceRegistered: true, 
    faceData: null,
    activo: true,
    ultimoAcceso: '2025-10-13 09:30:00'
  },
  { 
    id: 2, 
    username: 'tsys_user', 
    password: 'tsys123', 
    nombre: 'María García', 
    email: 'maria.garcia@banco.com',
    rol: 'tsys', 
    faceRegistered: true, 
    faceData: null,
    activo: true,
    ultimoAcceso: '2025-10-13 14:30:00'
  },
  { 
    id: 3, 
    username: 'dist_user', 
    password: 'dist123', 
    nombre: 'Roberto Sánchez', 
    email: 'roberto.sanchez@banco.com',
    rol: 'distribucion', 
    faceRegistered: false, 
    faceData: null,
    activo: true,
    ultimoAcceso: '2025-10-13 10:15:00'
  },
  { 
    id: 4, 
    username: 'mod_user', 
    password: 'mod123', 
    nombre: 'Ana López', 
    email: 'ana.lopez@banco.com',
    rol: 'modulos', 
    faceRegistered: true, 
    faceData: null,
    activo: true,
    ultimoAcceso: '2025-10-12 16:45:00'
  },
  { 
    id: 5, 
    username: 'director', 
    password: 'dir123', 
    nombre: 'Fernando Ruiz', 
    email: 'fernando.ruiz@banco.com',
    rol: 'consulta', 
    faceRegistered: false, 
    faceData: null,
    activo: true,
    ultimoAcceso: '2025-10-11 11:20:00'
  },
];

export default USUARIOS_INICIAL;
