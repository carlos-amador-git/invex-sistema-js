import api from './api';

export const inventoryService = {
  /**
   * Listar inventario de todos los productos
   */
  async getAll() {
    const response = await api.get('/inventario');
    return response.data;
  },

  /**
   * Obtener inventario de un producto
   */
  async getByProduct(productId) {
    const response = await api.get(`/inventario/${productId}`);
    return response.data;
  },

  /**
   * Obtener forecast de un producto
   */
  async getForecast(productId) {
    const response = await api.get(`/inventario/${productId}/forecast`);
    return response.data;
  },

  /**
   * Actualizar inventario TSYS
   * @param {string} productId - ID del producto
   * @param {Object} data - Datos de TSYS
   * @param {number} mes - Mes para historial (opcional)
   * @param {number} anio - Año para historial (opcional)
   */
  async updateTSYS(productId, data, mes = null, anio = null) {
    let url = `/inventario/${productId}/tsys`;
    if (mes && anio) {
      url += `?mes=${mes}&anio=${anio}`;
    }
    const response = await api.put(url, data);
    return response.data;
  },

  /**
   * Actualizar inventario de Distribución
   * @param {string} productId - ID del producto
   * @param {Object} data - Datos de Distribución
   * @param {number} mes - Mes para historial (opcional)
   * @param {number} anio - Año para historial (opcional)
   */
  async updateDistribucion(productId, data, mes = null, anio = null) {
    let url = `/inventario/${productId}/distribucion`;
    if (mes && anio) {
      url += `?mes=${mes}&anio=${anio}`;
    }
    const response = await api.put(url, data);
    return response.data;
  },

  /**
   * Actualizar inventario de Módulos
   * @param {string} productId - ID del producto
   * @param {Object} data - Datos de Módulos
   * @param {number} mes - Mes para historial (opcional)
   * @param {number} anio - Año para historial (opcional)
   */
  async updateModulos(productId, data, mes = null, anio = null) {
    let url = `/inventario/${productId}/modulos`;
    if (mes && anio) {
      url += `?mes=${mes}&anio=${anio}`;
    }
    const response = await api.put(url, data);
    return response.data;
  },

  /**
   * Sincronizar forecast con datos de Procesos BAU
   */
  async syncForecast() {
    const response = await api.post('/inventario/sync-forecast');
    return response.data;
  },

  /**
   * Obtener resumen de inventario con desglose completo
   * (TSYS, Proceso, Virgen, Venta, Cadena)
   */
  async getResumen(productId) {
    const response = await api.get(`/inventario/${productId}/resumen`);
    return response.data;
  },

  /**
   * Sincronizar inventario en proceso desde órdenes de compra
   */
  async syncOrdenes() {
    const response = await api.post('/inventario/sync-ordenes');
    return response.data;
  }
};

export default inventoryService;
