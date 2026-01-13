import api from './api';

export const productService = {
  /**
   * Listar todos los productos
   */
  async getAll() {
    const response = await api.get('/productos');
    return response.data;
  },

  /**
   * Obtener producto por ID (SKU)
   */
  async getById(id) {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo producto
   */
  async create(productData) {
    const response = await api.post('/productos', productData);
    return response.data;
  },

  /**
   * Actualizar producto
   */
  async update(id, productData) {
    const response = await api.put(`/productos/${id}`, productData);
    return response.data;
  },

  /**
   * Desactivar producto
   */
  async delete(id) {
    const response = await api.delete(`/productos/${id}`);
    return response.data;
  }
};

export const providerService = {
  /**
   * Listar todos los proveedores
   */
  async getAll() {
    const response = await api.get('/proveedores');
    return response.data;
  },

  /**
   * Obtener proveedor por ID
   */
  async getById(id) {
    const response = await api.get(`/proveedores/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo proveedor
   */
  async create(providerData) {
    const response = await api.post('/proveedores', providerData);
    return response.data;
  },

  /**
   * Actualizar proveedor
   */
  async update(id, providerData) {
    const response = await api.put(`/proveedores/${id}`, providerData);
    return response.data;
  }
};

export default productService;
