import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

// Helper para extraer mensaje de error seguro
const getErrorMessage = (error, defaultMessage) => {
  const detail = error.response?.data?.detail;
  if (!detail) return defaultMessage;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || JSON.stringify(e)).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};

const AuthContext = createContext(null);

// Configuración de roles por defecto (fallback)
const DEFAULT_ROLES_CONFIG = {
  admin: {
    nombre: "Admin Inventario",
    area: "Inventario",
    color: "#8b5cf6",
    modulos: ["dashboard", "balance", "forecast", "productos", "ordenes", "usuarios", "configuracion"],
    permisos: { verTodo: true, editarTodo: true, crearOrdenes: true, gestionarUsuarios: true, verDashboard: true }
  },
  tsys: {
    nombre: "Usuario TSYS",
    area: "Almacén (TSYS)",
    color: "#3b82f6",
    modulos: ["captura-tsys", "mi-historial", "dashboard-lectura"],
    permisos: { editarInventarioTSYS: true, verDashboard: true }
  },
  distribucion: {
    nombre: "Distribución",
    area: "Distribución",
    color: "#f59e0b",
    modulos: ["captura-distribucion", "mi-historial", "dashboard-lectura"],
    permisos: { editarDemandaDistribucion: true, verDashboard: true }
  },
  modulos: {
    nombre: "Módulos",
    area: "Módulos",
    color: "#10b981",
    modulos: ["captura-modulos", "mi-historial", "dashboard-lectura"],
    permisos: { editarDemandaModulos: true, verDashboard: true }
  },
  consulta: {
    nombre: "Directivo",
    area: "Dirección",
    color: "#64748b",
    modulos: ["dashboard-lectura"],
    permisos: { verDashboard: true, soloLectura: true }
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [rolesConfig] = useState(DEFAULT_ROLES_CONFIG);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    const verifySession = async () => {
      const savedUser = localStorage.getItem('invex_user');
      const accessToken = localStorage.getItem('access_token');

      if (savedUser && accessToken) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('invex_user');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  // Login con usuario y contraseña
  const loginWithCredentials = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        return { success: true, user: result.user };
      }
      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Usuario o contraseña incorrectos') };
    }
  };

  // Login con reconocimiento facial
  const loginWithFace = async (faceDescriptor) => {
    try {
      const result = await authService.loginWithFace(faceDescriptor);
      if (result.success) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        return { success: true, user: result.user };
      }
      return { success: false, error: 'Error de autenticación facial' };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'No se pudo verificar el rostro') };
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUsuarios([]);
    }
  };

  // Registrar rostro de usuario
  const registerFace = async (userId, faceDescriptor) => {
    try {
      await authService.registerFace(userId, faceDescriptor);
      // Actualizar usuario local si es el actual
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => ({ ...prev, face_registered: true }));
        const savedUser = JSON.parse(localStorage.getItem('invex_user') || '{}');
        savedUser.face_registered = true;
        localStorage.setItem('invex_user', JSON.stringify(savedUser));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Error registrando rostro') };
    }
  };

  // Obtener configuración del rol actual
  const getRoleConfig = useCallback(() => {
    if (!currentUser) return null;
    return rolesConfig[currentUser.rol] || null;
  }, [currentUser, rolesConfig]);

  // Verificar si tiene permiso para un módulo
  const hasModuleAccess = useCallback((moduleId) => {
    const roleConfig = getRoleConfig();
    if (!roleConfig) return false;
    return roleConfig.modulos.includes(moduleId);
  }, [getRoleConfig]);

  // Verificar permiso específico
  const hasPermission = useCallback((permission) => {
    const roleConfig = getRoleConfig();
    if (!roleConfig) return false;
    return roleConfig.permisos[permission] === true;
  }, [getRoleConfig]);

  // Cargar usuarios (solo admin)
  const loadUsuarios = async () => {
    try {
      const users = await userService.getAll();
      setUsuarios(users);
      return users;
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      return [];
    }
  };

  // Actualizar usuario
  const updateUser = async (userId, data) => {
    try {
      const updated = await userService.update(userId, data);
      setUsuarios(prev => prev.map(u => u.id === userId ? updated : u));
      return { success: true, user: updated };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Error actualizando usuario') };
    }
  };

  // Agregar nuevo usuario
  const addUser = async (userData) => {
    try {
      const newUser = await userService.create(userData);
      setUsuarios(prev => [...prev, newUser]);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Error creando usuario') };
    }
  };

  // Eliminar usuario
  const deleteUser = async (userId) => {
    try {
      await userService.delete(userId);
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Error eliminando usuario') };
    }
  };

  const value = {
    currentUser,
    usuarios,
    isAuthenticated,
    loading,
    loginWithCredentials,
    loginWithFace,
    logout,
    registerFace,
    getRoleConfig,
    hasModuleAccess,
    hasPermission,
    updateUser,
    addUser,
    deleteUser,
    loadUsuarios,
    setUsuarios
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
