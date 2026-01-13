import api from './api';

export const procesosBAUService = {
  /**
   * Listar todos los procesos BAU con filtros opcionales
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tipo_proceso) params.append('tipo_proceso', filters.tipo_proceso);
    if (filters.mes) params.append('mes', filters.mes);
    if (filters.anio) params.append('anio', filters.anio);
    if (filters.producto_id) params.append('producto_id', filters.producto_id);
    if (filters.presupuesto_id) params.append('presupuesto_id', filters.presupuesto_id);

    const queryString = params.toString();
    const url = queryString ? `/procesos-bau?${queryString}` : '/procesos-bau';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Obtener proceso por ID
   */
  async getById(id) {
    const response = await api.get(`/procesos-bau/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo proceso BAU
   */
  async create(data) {
    const response = await api.post('/procesos-bau', data);
    return response.data;
  },

  /**
   * Actualizar proceso BAU
   */
  async update(id, data) {
    const response = await api.put(`/procesos-bau/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar proceso BAU
   */
  async delete(id) {
    const response = await api.delete(`/procesos-bau/${id}`);
    return response.data;
  },

  /**
   * Obtener historial de cambios de un proceso
   */
  async getHistorial(procesoId) {
    const response = await api.get(`/procesos-bau/historial/${procesoId}`);
    return response.data;
  },

  /**
   * Cargar datos desde archivo Excel
   */
  async uploadExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/procesos-bau/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Cargar lote de datos procesados desde frontend
   */
  async uploadBatch(data) {
    const response = await api.post('/procesos-bau/upload-batch', data);
    return response.data;
  }
};

// ============ Presupuestos Service ============

export const presupuestosService = {
  /**
   * Listar presupuestos (por defecto solo activos)
   */
  async getAll(activosOnly = true) {
    const response = await api.get(`/procesos-bau/presupuestos?activos_only=${activosOnly}`);
    return response.data;
  },

  /**
   * Crear nuevo presupuesto
   */
  async create(data) {
    const response = await api.post('/procesos-bau/presupuestos', data);
    return response.data;
  },

  /**
   * Actualizar presupuesto
   */
  async update(id, data) {
    const response = await api.put(`/procesos-bau/presupuestos/${id}`, data);
    return response.data;
  },

  /**
   * Desactivar presupuesto
   */
  async delete(id) {
    const response = await api.delete(`/procesos-bau/presupuestos/${id}`);
    return response.data;
  }
};

export default procesosBAUService;
