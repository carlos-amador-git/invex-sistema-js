import api from './api';

export const orderService = {
  /**
   * Listar todas las órdenes de compra con filtros opcionales
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tipo_material) params.append('tipo_material', filters.tipo_material);
    if (filters.presupuesto) params.append('presupuesto', filters.presupuesto);
    if (filters.proveedor_id) params.append('proveedor_id', filters.proveedor_id);
    if (filters.estatus) params.append('estatus', filters.estatus);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `/ordenes?${queryString}` : '/ordenes';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Obtener orden por ID
   */
  async getById(id) {
    const response = await api.get(`/ordenes/${id}`);
    return response.data;
  },

  /**
   * Crear nueva orden de compra
   */
  async create(orderData) {
    const response = await api.post('/ordenes', orderData);
    return response.data;
  },

  /**
   * Actualizar orden
   */
  async update(id, orderData) {
    const response = await api.put(`/ordenes/${id}`, orderData);
    return response.data;
  },

  /**
   * Eliminar orden
   */
  async delete(id) {
    const response = await api.delete(`/ordenes/${id}`);
    return response.data;
  },

  /**
   * Obtener estadísticas de órdenes
   */
  async getStats() {
    const response = await api.get('/ordenes/stats/resumen');
    return response.data;
  },

  // ============ Entregas Parciales ============

  /**
   * Listar entregas parciales de una orden
   */
  async getEntregas(ordenId) {
    const response = await api.get(`/ordenes/${ordenId}/entregas`);
    return response.data;
  },

  /**
   * Crear entrega parcial
   */
  async createEntrega(ordenId, entregaData) {
    const response = await api.post(`/ordenes/${ordenId}/entregas`, entregaData);
    return response.data;
  },

  /**
   * Actualizar entrega parcial
   */
  async updateEntrega(entregaId, entregaData) {
    const response = await api.put(`/ordenes/entregas/${entregaId}`, entregaData);
    return response.data;
  },

  /**
   * Eliminar entrega parcial
   */
  async deleteEntrega(entregaId) {
    const response = await api.delete(`/ordenes/entregas/${entregaId}`);
    return response.data;
  },

  // ============ Import desde Excel ============

  /**
   * Importar órdenes en batch desde datos procesados
   * @param {Array} data - Datos de órdenes a importar
   * @param {boolean} autoCreateProducts - Si crear productos automáticamente cuando no existen
   */
  async importBatch(data, autoCreateProducts = false) {
    const response = await api.post(`/ordenes/import-batch?auto_create_products=${autoCreateProducts}`, data);
    return response.data;
  },

  // ============ Historial de Auditoría ============

  /**
   * Obtener historial de cambios de una orden
   */
  async getHistorial(ordenId) {
    const response = await api.get(`/ordenes/historial/${ordenId}`);
    return response.data;
  },

  /**
   * Obtener historial de todas las órdenes (admin)
   */
  async getHistorialAll(limit = 100) {
    const response = await api.get(`/ordenes/historial/?limit=${limit}`);
    return response.data;
  },

  // ============ Generación de PDF ============

  /**
   * Descargar PDF de orden de compra (datos básicos)
   */
  async downloadPDF(ordenId) {
    const response = await api.get(`/ordenes/${ordenId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Descargar PDF de orden de compra con datos personalizados
   * @param {string} ordenId - ID de la orden
   * @param {object} extraData - Datos adicionales para el PDF
   */
  async downloadPDFCustom(ordenId, extraData) {
    const response = await api.post(`/ordenes/${ordenId}/pdf`, extraData, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Helper para descargar el blob como archivo
   */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default orderService;
