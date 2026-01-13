import api from './api';

export const userService = {
  /**
   * Listar todos los usuarios
   */
  async getAll() {
    const response = await api.get('/usuarios');
    return response.data;
  },

  /**
   * Obtener usuario por ID
   */
  async getById(id) {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo usuario
   */
  async create(userData) {
    const response = await api.post('/usuarios', userData);
    return response.data;
  },

  /**
   * Actualizar usuario
   */
  async update(id, userData) {
    const response = await api.put(`/usuarios/${id}`, userData);
    return response.data;
  },

  /**
   * Desactivar usuario
   */
  async delete(id) {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  }
};

export default userService;
