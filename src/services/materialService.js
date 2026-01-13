import api from './api';

export const materialService = {
  /**
   * Listar todos los materiales
   */
  async getAll(activosOnly = true) {
    const response = await api.get('/materiales/', { params: { activos_only: activosOnly } });
    return response.data;
  },

  /**
   * Obtener resumen del inventario
   */
  async getResumen() {
    const response = await api.get('/materiales/resumen');
    return response.data;
  },

  /**
   * Obtener detalle de un material
   */
  async getById(numParte) {
    const response = await api.get(`/materiales/${numParte}`);
    return response.data;
  },

  /**
   * Crear nuevo material
   */
  async create(materialData) {
    const response = await api.post('/materiales', materialData);
    return response.data;
  },

  /**
   * Actualizar material
   */
  async update(numParte, materialData) {
    const response = await api.put(`/materiales/${numParte}`, materialData);
    return response.data;
  },

  /**
   * Registrar movimiento de material
   */
  async registrarMovimiento(movimiento) {
    const response = await api.post('/materiales/movimiento', movimiento);
    return response.data;
  },

  /**
   * Obtener historial de movimientos
   */
  async getMovimientos(numParte, limit = 50) {
    const response = await api.get(`/materiales/movimientos/${numParte}`, { params: { limit } });
    return response.data;
  },

  /**
   * Obtener materiales relacionados a un producto
   */
  async getMaterialesProducto(productoId) {
    const response = await api.get(`/materiales/relaciones/${productoId}`);
    return response.data;
  },

  /**
   * Crear relación producto-material
   */
  async crearRelacion(relacion) {
    const response = await api.post('/materiales/relacion', relacion);
    return response.data;
  },

  /**
   * Eliminar relación producto-material
   */
  async eliminarRelacion(relacionId) {
    const response = await api.delete(`/materiales/relacion/${relacionId}`);
    return response.data;
  },

  /**
   * Actualizar todas las relaciones de un producto (Card Carrier)
   * Reemplaza las relaciones existentes con las nuevas
   */
  async actualizarRelacionesProducto(productoId, relaciones) {
    const response = await api.put(`/materiales/relaciones/${productoId}`, relaciones);
    return response.data;
  },

  /**
   * Obtener alertas activas
   */
  async getAlertas() {
    const response = await api.get('/materiales/alertas');
    return response.data;
  },

  /**
   * Obtener reporte de diferencias plásticos vs materiales
   */
  async getReporteDiferencias() {
    const response = await api.get('/materiales/diferencias');
    return response.data;
  },

  /**
   * Obtener capacidad de ensamble de kits completos por producto
   * Calcula cuántos kits se pueden armar y cuál es el material limitante
   */
  async getCapacidadEnsamble() {
    const response = await api.get('/materiales/capacidad-ensamble');
    return response.data;
  }
};

export default materialService;
