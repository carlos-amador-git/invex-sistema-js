import api from './api';

export const roleService = {
  /**
   * Listar todos los roles
   */
  async getAll() {
    const response = await api.get('/roles/');
    return response.data;
  },

  /**
   * Obtener rol por nombre
   */
  async getByName(name) {
    const response = await api.get(`/roles/${name}/`);
    return response.data;
  }
};

export default roleService;
