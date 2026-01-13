import api from './api';

export const inventarioHistorialService = {
  /**
   * Obtener historial de un producto
   * @param {string} productoId - ID del producto
   * @param {string} area - Área: 'tsys', 'distribucion', 'modulos' (opcional)
   * @param {number} anio - Año a filtrar (opcional)
   */
  async getHistorial(productoId, area = null, anio = null) {
    let url = `/inventario-historial/${productoId}`;
    const params = new URLSearchParams();
    if (area) params.append('area', area);
    if (anio) params.append('anio', anio);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await api.get(url);
    return response.data;
  },

  /**
   * Obtener datos comparativos para gráficas y tablas
   * @param {string} productoId - ID del producto
   * @param {string} area - Área: 'tsys', 'distribucion', 'modulos'
   * @param {number} anio - Año a filtrar (opcional)
   */
  async getComparativo(productoId, area, anio = null) {
    let url = `/inventario-historial/${productoId}/comparativo?area=${area}`;
    if (anio) url += `&anio=${anio}`;

    const response = await api.get(url);
    return response.data;
  },

  /**
   * Crear un nuevo registro de historial
   * @param {Object} data - Datos del registro
   */
  async create(data) {
    const response = await api.post('/inventario-historial', data);
    return response.data;
  },

  /**
   * Actualizar un registro de historial
   * @param {number} id - ID del registro
   * @param {Object} data - Datos a actualizar
   */
  async update(id, data) {
    const response = await api.put(`/inventario-historial/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un registro de historial
   * @param {number} id - ID del registro
   */
  async delete(id) {
    const response = await api.delete(`/inventario-historial/${id}`);
    return response.data;
  },

  /**
   * Obtener historial de auditoría de un registro
   * @param {number} id - ID del registro
   */
  async getAuditoria(id) {
    const response = await api.get(`/inventario-historial/${id}/auditoria`);
    return response.data;
  },

  /**
   * Obtener resumen del historial de un producto
   * @param {string} productoId - ID del producto
   */
  async getResumen(productoId) {
    const response = await api.get(`/inventario-historial/${productoId}/resumen`);
    return response.data;
  }
};

export default inventarioHistorialService;
