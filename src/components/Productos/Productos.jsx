import React, { useState, useEffect } from 'react';
import {
  Package, Plus, RefreshCw, AlertCircle, Search,
  Grid3X3, List, Edit2, Trash2, X, CreditCard,
  Building2, Clock, DollarSign, Tag, CheckCircle,
  XCircle, Filter, MoreVertical, Layers, Save, Box
} from 'lucide-react';
import { productService, providerService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { materialService } from '../../services/materialService';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../EmptyState/EmptyState';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './Productos.css';

const TIPOS_MATERIAL = [
  { value: 'welcome_kit', label: 'Welcome Kit', icon: '📦' },
  { value: 'inserto', label: 'Inserto', icon: '📄' },
  { value: 'bolsa_segurisello', label: 'Bolsa Segurisello', icon: '🛡️' },
  { value: 'sobre', label: 'Sobre', icon: '✉️' },
  { value: 'etiqueta', label: 'Etiqueta', icon: '🏷️' }
];

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaCards, setVistaCards] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);

  // Estados para Card Carrier
  const [showCardCarrierModal, setShowCardCarrierModal] = useState(false);
  const [cardCarrierProducto, setCardCarrierProducto] = useState(null);
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [materialesAsignados, setMaterialesAsignados] = useState([]);
  const [loadingCarrier, setLoadingCarrier] = useState(false);
  const [savingCarrier, setSavingCarrier] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState({ num_parte: '', tipo_material: '' });

  // Modal de confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'danger'
  });

  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productosData, proveedoresData, inventariosData] = await Promise.all([
        productService.getAll(),
        providerService.getAll().catch(() => []),
        inventoryService.getAll().catch(() => [])
      ]);
      setProductos(productosData);
      setProveedores(proveedoresData);
      setInventarios(inventariosData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const getInventarioProducto = (productoId) => {
    const inv = inventarios.find(i => i.producto_id === productoId);
    if (!inv) return 0;
    return (inv.boveda_trabajo || 0) + (inv.boveda_principal || 0);
  };

  const getProveedorNombre = (proveedorId) => {
    const prov = proveedores.find(p => p.id === proveedorId);
    return prov?.nombre || 'N/A';
  };

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = busqueda === '' ||
      p.id?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchProveedor = filtroProveedor === 'todos' || p.proveedor === filtroProveedor;
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
    return matchBusqueda && matchProveedor && matchTipo;
  });

  const tiposUnicos = [...new Set(productos.map(p => p.tipo).filter(Boolean))];
  const proveedoresUnicos = [...new Set(productos.map(p => p.proveedor).filter(Boolean))];

  const calcularStats = () => {
    const totalProductos = productos.length;
    const totalInventario = inventarios.reduce((sum, inv) =>
      sum + (inv.boveda_trabajo || 0) + (inv.boveda_principal || 0), 0);
    const valorTotal = productos.reduce((sum, p) => {
      const inv = getInventarioProducto(p.id);
      return sum + (inv * (p.costo_unitario || 0));
    }, 0);
    return { totalProductos, totalInventario, valorTotal };
  };

  const stats = calcularStats();

  const handleEditar = (producto) => {
    setProductoEditar(producto);
    setShowModal(true);
  };

  const handleNuevo = () => {
    setProductoEditar(null);
    setShowModal(true);
  };

  // === Funciones Card Carrier ===
  const handleOpenCardCarrier = async (producto) => {
    setCardCarrierProducto(producto);
    setShowCardCarrierModal(true);
    setLoadingCarrier(true);

    try {
      // Cargar materiales disponibles y asignados
      const [materialesData, asignadosData] = await Promise.all([
        materialService.getAll(),
        materialService.getMaterialesProducto(producto.id)
      ]);
      setMaterialesDisponibles(materialesData);
      setMaterialesAsignados(asignadosData);
    } catch (err) {
      console.error('Error cargando Card Carrier:', err);
      toast.error('Error al cargar los materiales');
    } finally {
      setLoadingCarrier(false);
    }
  };

  const handleAddMaterial = () => {
    if (!nuevoMaterial.num_parte || !nuevoMaterial.tipo_material) {
      toast.warning('Selecciona un material y un tipo');
      return;
    }

    // Verificar que no esté ya asignado
    const yaAsignado = materialesAsignados.find(m => m.num_parte === nuevoMaterial.num_parte);
    if (yaAsignado) {
      toast.warning('Este material ya está asignado');
      return;
    }

    // Buscar datos del material
    const material = materialesDisponibles.find(m => m.num_parte === nuevoMaterial.num_parte);
    if (!material) return;

    setMaterialesAsignados(prev => [...prev, {
      num_parte: material.num_parte,
      descripcion: material.descripcion,
      tipo_material: nuevoMaterial.tipo_material,
      total_inventario: material.total_inventario || 0,
      nuevo: true  // Marcar como nuevo para distinguirlo
    }]);

    setNuevoMaterial({ num_parte: '', tipo_material: '' });
  };

  const handleRemoveMaterial = (numParte, descripcion) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Quitar este material?',
      message: `El material "${numParte}" será removido del Card Carrier. Podrás agregarlo nuevamente después.`,
      confirmLabel: 'Sí, quitar',
      variant: 'warning',
      onConfirm: () => {
        setMaterialesAsignados(prev => prev.filter(m => m.num_parte !== numParte));
        toast.info(`Material ${numParte} removido del Card Carrier`);
      }
    });
  };

  const handleSaveCardCarrier = async () => {
    if (!cardCarrierProducto) return;

    setSavingCarrier(true);
    try {
      // Preparar relaciones para enviar al backend
      const relaciones = materialesAsignados.map(m => ({
        producto_id: cardCarrierProducto.id,
        material_num_parte: m.num_parte,
        tipo_material: m.tipo_material
      }));

      await materialService.actualizarRelacionesProducto(cardCarrierProducto.id, relaciones);
      toast.success(`Card Carrier actualizado para ${cardCarrierProducto.id}`);
      setShowCardCarrierModal(false);
      setCardCarrierProducto(null);
    } catch (err) {
      console.error('Error guardando Card Carrier:', err);
      toast.error(err.response?.data?.detail || 'Error al guardar los materiales');
    } finally {
      setSavingCarrier(false);
    }
  };

  const getTipoIcon = (tipo) => {
    const tipoConfig = TIPOS_MATERIAL.find(t => t.value === tipo);
    return tipoConfig?.icon || '📋';
  };

  const getTipoLabel = (tipo) => {
    const tipoConfig = TIPOS_MATERIAL.find(t => t.value === tipo);
    return tipoConfig?.label || tipo;
  };

  const getMarcaIcon = (marca) => {
    if (marca?.toLowerCase().includes('visa')) return '💳';
    if (marca?.toLowerCase().includes('master')) return '💳';
    return '🏷️';
  };

  if (loading) {
    return (
      <div className="productos-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando catálogo de productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="productos-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="productos-wrapper">
      {/* Header */}
      <header className="productos-header">
        <div className="header-content">
          <div className="header-icon">
            <Package size={28} />
          </div>
          <div className="header-text">
            <h1>Catálogo de Productos</h1>
            <p>Gestión de productos de tarjetas bancarias</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadData}>
            <RefreshCw size={18} />
          </button>
          <button className="new-product-btn" onClick={handleNuevo}>
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="productos-stats">
        <div className="ps-card">
          <div className="ps-icon blue">
            <Package size={22} />
          </div>
          <div className="ps-content">
            <span className="ps-value">{stats.totalProductos}</span>
            <span className="ps-label">Productos Activos</span>
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-icon purple">
            <CreditCard size={22} />
          </div>
          <div className="ps-content">
            <span className="ps-value">{stats.totalInventario.toLocaleString()}</span>
            <span className="ps-label">Total Inventario</span>
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-icon green">
            <DollarSign size={22} />
          </div>
          <div className="ps-content">
            <span className="ps-value">${(stats.valorTotal / 1000000).toFixed(2)}M</span>
            <span className="ps-label">Valor Total</span>
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-icon yellow">
            <Building2 size={22} />
          </div>
          <div className="ps-content">
            <span className="ps-value">{proveedoresUnicos.length}</span>
            <span className="ps-label">Proveedores</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="productos-toolbar">
        <div className="toolbar-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por SKU o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
            >
              <option value="todos">Todos los proveedores</option>
              {proveedoresUnicos.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <Tag size={16} />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-views">
          <button
            className={`view-btn ${vistaCards ? 'active' : ''}`}
            onClick={() => setVistaCards(true)}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            className={`view-btn ${!vistaCards ? 'active' : ''}`}
            onClick={() => setVistaCards(false)}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Products Grid/Table */}
      {vistaCards ? (
        <div className="productos-grid">
          {productosFiltrados.length === 0 ? (
            <EmptyState
              icon="package"
              title="No hay productos"
              description={busqueda || filtroProveedor !== 'todos' || filtroTipo !== 'todos'
                ? "No hay productos que coincidan con los filtros aplicados"
                : "Aún no hay productos registrados en el catálogo"}
              actionLabel={!busqueda && filtroProveedor === 'todos' && filtroTipo === 'todos' ? "Agregar Producto" : null}
              onAction={!busqueda && filtroProveedor === 'todos' && filtroTipo === 'todos' ? () => setShowModal(true) : null}
            />
          ) : (
            productosFiltrados.map(producto => {
              const inventario = getInventarioProducto(producto.id);
              const estadoStock = inventario < 1000 ? 'danger' : inventario < 5000 ? 'warning' : 'success';

              return (
                <div key={producto.id} className="producto-card">
                  <div className="pc-header">
                    <div className="pc-sku">
                      <CreditCard size={16} />
                      <span>{producto.id}</span>
                    </div>
                    <div className={`pc-status ${estadoStock}`}>
                      {estadoStock === 'success' ? <CheckCircle size={14} /> :
                       estadoStock === 'warning' ? <Clock size={14} /> :
                       <AlertCircle size={14} />}
                    </div>
                  </div>

                  <div className="pc-body">
                    <h4 className="pc-name">{producto.nombre}</h4>
                    <div className="pc-tags">
                      {producto.marca && (
                        <span className="pc-tag marca">{producto.marca}</span>
                      )}
                      {producto.tipo && (
                        <span className="pc-tag tipo">{producto.tipo}</span>
                      )}
                    </div>
                  </div>

                  <div className="pc-info">
                    <div className="pc-info-row">
                      <Building2 size={14} />
                      <span>{producto.proveedor || 'N/A'}</span>
                    </div>
                    <div className="pc-info-row">
                      <Clock size={14} />
                      <span>{producto.tiempo_entrega || 8} semanas</span>
                    </div>
                    <div className="pc-info-row">
                      <DollarSign size={14} />
                      <span>${(producto.costo_unitario || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pc-inventory">
                    <div className="pc-inv-label">Inventario</div>
                    <div className={`pc-inv-value ${estadoStock}`}>
                      {inventario.toLocaleString()}
                    </div>
                  </div>

                  <div className="pc-actions">
                    <button
                      className="pc-action-btn carrier"
                      onClick={() => handleOpenCardCarrier(producto)}
                      title="Configurar materiales del Card Carrier"
                    >
                      <Layers size={14} />
                      Card Carrier
                    </button>
                    <button
                      className="pc-action-btn"
                      onClick={() => handleEditar(producto)}
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="productos-table-section">
          <div className="pts-container">
            <table className="productos-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nombre del Producto</th>
                  <th>Marca</th>
                  <th>Tipo</th>
                  <th>Proveedor</th>
                  <th>Tiempo Entrega</th>
                  <th>Costo Unit.</th>
                  <th>Inventario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(producto => {
                  const inventario = getInventarioProducto(producto.id);
                  const estadoStock = inventario < 1000 ? 'danger' : inventario < 5000 ? 'warning' : 'success';

                  return (
                    <tr key={producto.id}>
                      <td className="cell-sku">{producto.id}</td>
                      <td className="cell-name">{producto.nombre}</td>
                      <td>
                        {producto.marca && (
                          <span className="table-tag marca">{producto.marca}</span>
                        )}
                      </td>
                      <td>
                        {producto.tipo && (
                          <span className="table-tag tipo">{producto.tipo}</span>
                        )}
                      </td>
                      <td>{producto.proveedor || 'N/A'}</td>
                      <td className="cell-number">{producto.tiempo_entrega || 8} sem</td>
                      <td className="cell-number">${(producto.costo_unitario || 0).toFixed(2)}</td>
                      <td>
                        <span className={`inv-badge ${estadoStock}`}>
                          {inventario.toLocaleString()}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="table-action-btn carrier"
                          onClick={() => handleOpenCardCarrier(producto)}
                          title="Card Carrier"
                        >
                          <Layers size={14} />
                        </button>
                        <button
                          className="table-action-btn"
                          onClick={() => handleEditar(producto)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {productoEditar ? <Edit2 size={20} /> : <Plus size={20} />}
                {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>SKU / Item Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="J14968C"
                    defaultValue={productoEditar?.id || ''}
                    disabled={!!productoEditar}
                  />
                </div>
                <div className="form-group">
                  <label>Costo Unitario</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    defaultValue={productoEditar?.costo_unitario || ''}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nombre del Producto</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del producto"
                  defaultValue={productoEditar?.nombre || ''}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Proveedor</label>
                  <select className="form-select" defaultValue={productoEditar?.proveedor_id || ''}>
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tiempo de Entrega</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="8"
                    defaultValue={productoEditar?.tiempo_entrega || 8}
                  />
                  <span className="form-hint">semanas</span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <select className="form-select" defaultValue={productoEditar?.marca || ''}>
                    <option value="">Seleccionar...</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="American Express">American Express</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select className="form-select" defaultValue={productoEditar?.tipo || ''}>
                    <option value="">Seleccionar...</option>
                    <option value="Credito">Crédito</option>
                    <option value="Debito">Débito</option>
                    <option value="Kit">Kit</option>
                    <option value="Prepago">Prepago</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-submit">
                {productoEditar ? <Edit2 size={16} /> : <Plus size={16} />}
                {productoEditar ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Card Carrier */}
      {showCardCarrierModal && (
        <div className="modal-overlay" onClick={() => setShowCardCarrierModal(false)}>
          <div className="modal-content modal-carrier" onClick={e => e.stopPropagation()}>
            <div className="modal-header carrier-header">
              <h3>
                <Layers size={20} />
                Card Carrier - {cardCarrierProducto?.id}
              </h3>
              <button className="modal-close" onClick={() => setShowCardCarrierModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingCarrier ? (
                <div className="carrier-loading">
                  <RefreshCw className="spin" size={32} />
                  <p>Cargando materiales...</p>
                </div>
              ) : (
                <>
                  {/* Info del producto */}
                  <div className="carrier-product-info">
                    <CreditCard size={20} />
                    <div>
                      <strong>{cardCarrierProducto?.nombre}</strong>
                      <span>{cardCarrierProducto?.marca} - {cardCarrierProducto?.tipo}</span>
                    </div>
                  </div>

                  {/* Lista de materiales asignados */}
                  <div className="carrier-section">
                    <h4>
                      <Box size={16} />
                      Materiales Asignados ({materialesAsignados.length})
                    </h4>

                    {materialesAsignados.length === 0 ? (
                      <div className="carrier-empty">
                        <Package size={32} />
                        <p>No hay materiales asignados a este producto</p>
                      </div>
                    ) : (
                      <div className="carrier-materials-list">
                        {materialesAsignados.map((mat, idx) => (
                          <div key={idx} className={`carrier-material-item ${mat.nuevo ? 'nuevo' : ''}`}>
                            <div className="mat-icon">{getTipoIcon(mat.tipo_material)}</div>
                            <div className="mat-info">
                              <span className="mat-parte">{mat.num_parte}</span>
                              <span className="mat-desc">{mat.descripcion}</span>
                              <span className="mat-tipo">{getTipoLabel(mat.tipo_material)}</span>
                            </div>
                            <div className="mat-stock">
                              {(mat.total_inventario || 0).toLocaleString()}
                            </div>
                            <button
                              className="mat-remove"
                              onClick={() => handleRemoveMaterial(mat.num_parte, mat.descripcion)}
                              title="Quitar material"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Agregar nuevo material */}
                  <div className="carrier-section add-section">
                    <h4>
                      <Plus size={16} />
                      Agregar Material
                    </h4>

                    <div className="carrier-add-form">
                      <div className="form-group">
                        <label>Material</label>
                        <select
                          className="form-select"
                          value={nuevoMaterial.num_parte}
                          onChange={(e) => setNuevoMaterial(prev => ({ ...prev, num_parte: e.target.value }))}
                        >
                          <option value="">Seleccionar material...</option>
                          {materialesDisponibles
                            .filter(m => !materialesAsignados.find(a => a.num_parte === m.num_parte))
                            .map(m => (
                              <option key={m.num_parte} value={m.num_parte}>
                                {m.num_parte} - {m.descripcion}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Tipo de Material</label>
                        <select
                          className="form-select"
                          value={nuevoMaterial.tipo_material}
                          onChange={(e) => setNuevoMaterial(prev => ({ ...prev, tipo_material: e.target.value }))}
                        >
                          <option value="">Seleccionar tipo...</option>
                          {TIPOS_MATERIAL.map(t => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        className="btn-add-material"
                        onClick={handleAddMaterial}
                        disabled={!nuevoMaterial.num_parte || !nuevoMaterial.tipo_material}
                      >
                        <Plus size={16} />
                        Agregar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCardCarrierModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-submit"
                onClick={handleSaveCardCarrier}
                disabled={savingCarrier}
              >
                {savingCarrier ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                {savingCarrier ? 'Guardando...' : 'Guardar Card Carrier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel || 'Confirmar'}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default Productos;
