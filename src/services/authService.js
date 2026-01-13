import api from './api';

export const authService = {
  /**
   * Login con usuario y contraseña
   */
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, refresh_token, user } = response.data;

    // Guardar tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('invex_user', JSON.stringify(user));

    return { success: true, user };
  },

  /**
   * Login con reconocimiento facial
   */
  async loginWithFace(faceDescriptor) {
    const response = await api.post('/auth/login/facial', {
      face_descriptor: Array.from(faceDescriptor)
    });
    const { access_token, refresh_token, user } = response.data;

    // Guardar tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('invex_user', JSON.stringify(user));

    return { success: true, user };
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignorar errores de logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('invex_user');
    }
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Verificar si hay sesión activa
   */
  async verifySession() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { valid: false };
    }

    try {
      const user = await this.getCurrentUser();
      return { valid: true, user };
    } catch (error) {
      return { valid: false };
    }
  },

  /**
   * Registrar rostro de usuario
   */
  async registerFace(userId, faceDescriptor) {
    const response = await api.post(`/usuarios/${userId}/face`, {
      face_descriptor: Array.from(faceDescriptor)
    });
    return response.data;
  },

  /**
   * Eliminar registro facial
   */
  async deleteFace(userId) {
    const response = await api.delete(`/usuarios/${userId}/face`);
    return response.data;
  }
};

export default authService;
