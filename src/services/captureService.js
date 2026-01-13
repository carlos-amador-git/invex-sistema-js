import api from './api';

export const captureService = {
  /**
   * Listar todas las capturas (admin)
   */
  async getAll() {
    const response = await api.get('/capturas');
    return response.data;
  },

  /**
   * Listar capturas del usuario actual
   */
  async getMyCapturas() {
    const response = await api.get('/capturas/mis-capturas');
    return response.data;
  },

  /**
   * Obtener detalle de una captura
   */
  async getById(id) {
    const response = await api.get(`/capturas/${id}`);
    return response.data;
  },

  /**
   * Registrar nueva captura
   */
  async create(captureData) {
    const response = await api.post('/capturas', captureData);
    return response.data;
  }
};

export default captureService;
