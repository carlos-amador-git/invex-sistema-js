import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Package, AlertTriangle, CheckCircle,
  RefreshCw, ChevronDown, ChevronUp, Layers,
  AlertCircle, Box, Zap, List, Grid3X3, Database,
  Upload, Save, X, Edit3, Trash2, Plus, FileSpreadsheet, Search,
  ShoppingCart, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { materialService } from '../../services/materialService';
import { useToast } from '../../context/ToastContext';
import { PRODUCTOS } from '../../data/productos';
import './Materiales.css';

const InventarioMateriales = ({ setActiveModule, setPendingOrden }) => {
  const [activeTab, setActiveTab] = useState('capacidad');
  const [capacidadData, setCapacidadData] = useState([]);
  const [materialesData, setMaterialesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState('');
  const [materialesProducto, setMaterialesProducto] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);

  // Estado para análisis por material
  const [selectedMaterial, setSelectedMaterial] = useState('');

  // Estado para gestión de inventario
  const [inventarioMateriales, setInventarioMateriales] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMaterial, setNewMaterial] = useState({
    num_parte: '',
    descripcion: '',
    cantidad_recibida: 0,
    fecha_ultimo_ingreso: '',
    saldo_actual: 0,
    fecha_ultimo_movimiento: '',
    total_almacen: 0,
    total_piso: 0,
    total: 0
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProducto) {
      loadMaterialesProducto(selectedProducto);
    }
  }, [selectedProducto]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [capacidad, materiales] = await Promise.all([
        materialService.getCapacidadEnsamble(),
        materialService.getAll()
      ]);
      setCapacidadData(capacidad);
      setMaterialesData(materiales);
      // Para gestión, usamos los materiales cargados
      setInventarioMateriales(materiales.map(m => ({
        ...m,
        cantidad_recibida: m.cantidad_recibida || 0,
        fecha_ultimo_ingreso: m.fecha_ultimo_ingreso || '',
        saldo_actual: m.cantidad_disponible || 0,
        fecha_ultimo_movimiento: m.fecha_ultimo_movimiento || '',
        total_almacen: m.total_almacen || m.cantidad_disponible || 0,
        total_piso: m.total_piso || 0,
        total: m.total || m.cantidad_disponible || 0,
        dias_sin_movimiento: m.dias_sin_movimiento || 0
      })));
    } catch (err) {
      setError('Error al cargar los datos');
      toast.error('Error al cargar datos de materiales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterialesProducto = async (productoId) => {
    setLoadingMateriales(true);
    try {
      const materiales = await materialService.getMaterialesProducto(productoId);
      setMaterialesProducto(materiales);
    } catch (err) {
      console.error(err);
      setMaterialesProducto([]);
    } finally {
      setLoadingMateriales(false);
    }
  };

  const getTipoIcon = (tipo) => {
    switch(tipo) {
      case 'welcome_kit': return '📦';
      case 'inserto': return '📄';
      case 'bolsa_segurisello': return '🛡️';
      case 'plastico': return '💳';
      case 'sobre': return '✉️';
      case 'etiqueta': return '🏷️';
      default: return '📋';
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      'welcome_kit': 'Welcome Kit',
      'inserto': 'Inserto',
      'bolsa_segurisello': 'Bolsa Segurisello',
      'plastico': 'Plástico',
      'sobre': 'Sobre',
      'etiqueta': 'Etiqueta'
    };
    return labels[tipo] || tipo;
  };

  const getStatusColor = (producto) => {
    if (!producto.puede_ensamblar) return 'danger';
    if (producto.excedente_plasticos > 0 && producto.tipo_limitante !== 'plastico') return 'warning';
    return 'success';
  };

  // Funciones para gestión de inventario
  const handleEdit = (material) => {
    setEditingRow(material.num_parte);
    setEditData({ ...material });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await materialService.update(editData.num_parte, editData);
      setInventarioMateriales(prev =>
        prev.map(m => m.num_parte === editData.num_parte ? editData : m)
      );
      toast.success('Material actualizado correctamente');
      setEditingRow(null);
      setEditData({});
    } catch (err) {
      toast.error('Error al actualizar el material');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.num_parte || !newMaterial.descripcion) {
      toast.warning('Número de parte y descripción son requeridos');
      return;
    }

    setSaving(true);
    try {
      // Detectar tipo basado en el número de parte
      let tipo = 'otro';
      const numParte = newMaterial.num_parte.toUpperCase();
      if (numParte.includes('WELCOME') || numParte.includes('WK') || numParte.startsWith('E14-05')) {
        tipo = 'welcome_kit';
      } else if (numParte.includes('SOBRE') || numParte.startsWith('E08')) {
        tipo = 'sobre';
      } else if (numParte.includes('ETIQUETA') || numParte.startsWith('E16')) {
        tipo = 'etiqueta';
      } else if (numParte.includes('INSERTO')) {
        tipo = 'inserto';
      } else if (numParte.includes('BOLSA')) {
        tipo = 'bolsa_segurisello';
      }

      const materialData = {
        ...newMaterial,
        tipo,
        cantidad_disponible: newMaterial.total || newMaterial.saldo_actual || 0,
        activo: true
      };

      await materialService.create(materialData);
      toast.success('Material agregado correctamente');
      setShowAddModal(false);
      setNewMaterial({
        num_parte: '',
        descripcion: '',
        cantidad_recibida: 0,
        fecha_ultimo_ingreso: '',
        saldo_actual: 0,
        fecha_ultimo_movimiento: '',
        total_almacen: 0,
        total_piso: 0,
        total: 0
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al agregar el material');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        // Mapear columnas del Excel a nuestro formato
        const materialesFromExcel = jsonData.map(row => {
          // Limpiar valores numéricos que vienen con comas
          const cleanNumber = (val) => {
            if (!val) return 0;
            const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
            return parseInt(cleaned) || 0;
          };

          return {
            num_parte: (row['NUM_PARTE'] || row['num_parte'] || row['Num Parte'] || '').toString().trim(),
            descripcion: row['DESCRIPCION'] || row['descripcion'] || row['Descripcion'] || '',
            cantidad_recibida: cleanNumber(row['CANTIDAD_RECIBIDA'] || row['cantidad_recibida']),
            fecha_ultimo_ingreso: row['FECHA_ULTIMO_INGRESO'] || row['fecha_ultimo_ingreso'] || '',
            saldo_actual: cleanNumber(row['SALDO_ACTUAL'] || row['saldo_actual']),
            fecha_ultimo_movimiento: row['FECHA_ULTIMO_MOVIMIENTO'] || row['fecha_ultimo_movimiento'] || '',
            total_almacen: cleanNumber(row['Total Almacén General'] || row['total_almacen'] || row['TOTAL_ALMACEN']),
            total_piso: cleanNumber(row['Total Piso Producción'] || row['total_piso'] || row['TOTAL_PISO']),
            total: cleanNumber(row['TOTAL'] || row['total']),
            dias_sin_movimiento: cleanNumber(row['DÍAS SIN MOVIMIENTO'] || row['dias_sin_movimiento'])
          };
        }).filter(m => m.num_parte); // Filtrar filas vacías

        if (materialesFromExcel.length === 0) {
          toast.warning('No se encontraron datos válidos en el archivo');
          return;
        }

        // Crear un mapa de materiales existentes para búsqueda rápida
        const existingMaterialsMap = new Map(
          inventarioMateriales.map(m => [m.num_parte.toString().trim().toUpperCase(), m])
        );

        // Función para parsear fechas del Excel
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          // Si es un número (fecha de Excel), convertir
          if (typeof dateStr === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
            return date.toISOString().split('T')[0];
          }
          // Si es string, intentar parsear
          const str = String(dateStr).trim();
          if (!str) return null;
          // Intentar formato DD/MM/YYYY
          const parts = str.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // Intentar formato YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            return str.substring(0, 10);
          }
          return null;
        };

        // Procesar cada material
        setSaving(true);
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (const mat of materialesFromExcel) {
          try {
            // Mapear a los nombres de campo que espera el backend
            const materialData = {
              num_parte: mat.num_parte,
              descripcion: mat.descripcion || '',
              cantidad_recibida: mat.cantidad_recibida || 0,
              fecha_ultimo_ingreso: parseDate(mat.fecha_ultimo_ingreso),
              saldo_actual: mat.saldo_actual || 0,
              fecha_ultimo_movimiento: parseDate(mat.fecha_ultimo_movimiento),
              total_almacen_general: mat.total_almacen || 0,
              total_piso_produccion: mat.total_piso || 0
            };

            // Verificar si el material ya existe en la base de datos
            const existingMaterial = existingMaterialsMap.get(mat.num_parte.toUpperCase());

            if (existingMaterial) {
              // El material existe, actualizarlo
              await materialService.update(mat.num_parte, materialData);
              updated++;
            } else {
              // El material no existe, crearlo
              try {
                await materialService.create(materialData);
                created++;
              } catch (createErr) {
                // Si falla crear, intentar actualizar (puede existir en BD pero no en cache)
                try {
                  await materialService.update(mat.num_parte, materialData);
                  updated++;
                } catch {
                  console.error(`Error procesando ${mat.num_parte}:`, createErr);
                  errors++;
                }
              }
            }
          } catch (err) {
            console.error(`Error procesando ${mat.num_parte}:`, err);
            errors++;
          }
        }

        const message = `Importación completada: ${updated} actualizados, ${created} creados${errors > 0 ? `, ${errors} errores` : ''}`;
        if (errors > 0) {
          toast.warning(message);
        } else {
          toast.success(message);
        }
        loadData();
      } catch (err) {
        toast.error('Error al procesar el archivo Excel');
        console.error(err);
      } finally {
        setSaving(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString();
  };

  // Función para crear orden de compra de material
  const handleCrearOrdenMaterial = (material, cantidadFaltante) => {
    const ordenData = {
      tipo: 'material',
      material_id: material?.num_parte,
      material_descripcion: material?.descripcion,
      cantidad: Math.abs(cantidadFaltante),
      fecha_orden: new Date().toISOString().split('T')[0]
    };

    if (setPendingOrden) {
      setPendingOrden(ordenData);
    }
    if (setActiveModule) {
      setActiveModule('ordenes');
    }
    toast.info(`Creando orden para ${Math.abs(cantidadFaltante).toLocaleString()} unidades de ${material?.num_parte || 'material'}`);
  };

  // Calcular totales
  const totales = capacidadData.reduce((acc, p) => ({
    plasticos: acc.plasticos + (p.plasticos_disponibles || 0),
    kits: acc.kits + (p.capacidad_ensamble || 0),
    excedente: acc.excedente + (p.excedente_plasticos > 0 ? p.excedente_plasticos : 0)
  }), { plasticos: 0, kits: 0, excedente: 0 });

  if (loading) {
    return (
      <div className="materiales-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando datos de materiales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="materiales-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadData} className="btn btn-primary">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="materiales-wrapper">
      {/* Header with Tabs */}
      <header className="materiales-header">
        <div className="header-content">
          <div className="header-icon">
            <Layers size={32} />
          </div>
          <div className="header-text">
            <h1>Inventario de Materiales</h1>
            <p>Gestión de materiales y capacidad de ensamble</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={loadData}>
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Tabs */}
      <div className="materiales-tabs">
        <button
          className={`tab-btn ${activeTab === 'capacidad' ? 'active' : ''}`}
          onClick={() => setActiveTab('capacidad')}
        >
          <Grid3X3 size={18} />
          Capacidad de Ensamble
        </button>
        <button
          className={`tab-btn ${activeTab === 'materiales' ? 'active' : ''}`}
          onClick={() => setActiveTab('materiales')}
        >
          <Package size={18} />
          Análisis por Material
        </button>
        <button
          className={`tab-btn ${activeTab === 'gestion' ? 'active' : ''}`}
          onClick={() => setActiveTab('gestion')}
        >
          <Database size={18} />
          Gestión de Inventario
        </button>
      </div>

      {/* Tab: Capacidad de Ensamble */}
      {activeTab === 'capacidad' && (
        <>
          {/* Info Banner */}
          <div className="info-banner kit-info">
            <Box size={20} />
            <div>
              <strong>1 Kit Completo =</strong>
              <span className="kit-formula">
                <span className="kit-item">💳 1 Plástico</span>
                <span className="kit-plus">+</span>
                <span className="kit-item">📦 1 Welcome Kit</span>
                <span className="kit-plus">+</span>
                <span className="kit-item">📄 1 Inserto</span>
                <span className="kit-plus">+</span>
                <span className="kit-item">🛡️ 1 Bolsa</span>
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon plasticos">
                <CreditCard size={24} />
              </div>
              <div className="summary-data">
                <span className="summary-value">{totales.plasticos.toLocaleString()}</span>
                <span className="summary-label">Plásticos Totales</span>
              </div>
            </div>

            <div className="summary-card highlight">
              <div className="summary-icon kits">
                <Package size={24} />
              </div>
              <div className="summary-data">
                <span className="summary-value">{totales.kits.toLocaleString()}</span>
                <span className="summary-label">Kits Ensamblables</span>
              </div>
            </div>

            {totales.excedente > 0 && (
              <div className="summary-card alert">
                <div className="summary-icon warning">
                  <AlertTriangle size={24} />
                </div>
                <div className="summary-data">
                  <span className="summary-value">{totales.excedente.toLocaleString()}</span>
                  <span className="summary-label">Sin Material Suficiente</span>
                </div>
              </div>
            )}
          </div>

          {/* Products List */}
          <div className="products-capacity-list">
            {capacidadData.map(producto => {
              const isExpanded = expandedProduct === producto.producto_id;
              const status = getStatusColor(producto);

              return (
                <div
                  key={producto.producto_id}
                  className={`product-capacity-card ${status} ${isExpanded ? 'expanded' : ''}`}
                >
                  <div
                    className="product-header"
                    onClick={() => setExpandedProduct(isExpanded ? null : producto.producto_id)}
                  >
                    <div className="product-info">
                      <div className="product-icon">
                        <CreditCard size={24} />
                      </div>
                      <div className="product-details">
                        <span className="product-id">{producto.producto_id}</span>
                        <h3 className="product-name" title={producto.producto_nombre}>
                          {producto.producto_nombre}
                        </h3>
                      </div>
                    </div>

                    <div className="product-metrics">
                      <div className="metric">
                        <span className="metric-value">{producto.plasticos_disponibles?.toLocaleString()}</span>
                        <span className="metric-label">Plásticos</span>
                      </div>

                      <div className="metric-arrow">→</div>

                      <div className="metric highlight">
                        <span className="metric-value">{producto.capacidad_ensamble?.toLocaleString()}</span>
                        <span className="metric-label">Kits Posibles</span>
                      </div>

                      {producto.excedente_plasticos > 0 && producto.tipo_limitante !== 'plastico' && (
                        <div className="metric deficit">
                          <span className="metric-value">-{producto.excedente_plasticos?.toLocaleString()}</span>
                          <span className="metric-label">Sin Material</span>
                        </div>
                      )}
                    </div>

                    <div className="product-status">
                      {status === 'success' && (
                        <span className="status-badge success">
                          <CheckCircle size={16} />
                          Balanceado
                        </span>
                      )}
                      {status === 'warning' && (
                        <span className="status-badge warning">
                          <AlertTriangle size={16} />
                          Falta Material
                        </span>
                      )}
                      {status === 'danger' && (
                        <span className="status-badge danger">
                          <AlertCircle size={16} />
                          Sin Capacidad
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="product-expanded">
                      {/* Materiales Faltantes - Sección destacada */}
                      {producto.materiales_faltantes?.length > 0 && (
                        <div className="faltantes-section">
                          <h4 className="faltantes-title">
                            <AlertTriangle size={18} />
                            Materiales Insuficientes ({producto.materiales_faltantes.length})
                          </h4>
                          <div className="faltantes-grid">
                            {producto.materiales_faltantes.map((mat, idx) => (
                              <div key={idx} className="faltante-card">
                                <div className="faltante-header">
                                  <span className="faltante-icon">{getTipoIcon(mat.tipo)}</span>
                                  <span className="faltante-tipo">{getTipoLabel(mat.tipo)}</span>
                                  {mat.es_compartido && (
                                    <span className="compartido-badge" title={`Compartido con: ${mat.productos_compartidos?.join(', ')}`}>
                                      🔗 Compartido
                                    </span>
                                  )}
                                </div>
                                <div className="faltante-parte">{mat.num_parte}</div>
                                <div className="faltante-stats">
                                  <div className="stat">
                                    <span className="stat-label">Disponible</span>
                                    <span className="stat-value">{mat.disponible?.toLocaleString()}</span>
                                  </div>
                                  <div className="stat">
                                    <span className="stat-label">Necesario</span>
                                    <span className="stat-value">{mat.necesario?.toLocaleString()}</span>
                                  </div>
                                  <div className="stat deficit">
                                    <span className="stat-label">Faltante</span>
                                    <span className="stat-value">-{mat.faltante?.toLocaleString()}</span>
                                  </div>
                                </div>
                                {mat.es_compartido && mat.productos_compartidos?.length > 0 && (
                                  <div className="compartido-info">
                                    <span className="compartido-label">También usado en:</span>
                                    <span className="compartido-productos">
                                      {mat.productos_compartidos.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alerta principal */}
                      {producto.alerta && producto.materiales_faltantes?.length === 0 && (
                        <div className={`alert-message ${status}`}>
                          <Zap size={16} />
                          <span>{producto.alerta}</span>
                        </div>
                      )}

                      {/* Componentes del Kit */}
                      <div className="components-section">
                        <h4>Componentes del Kit</h4>
                        <div className="components-table">
                          {/* Plástico Row */}
                          <div className={`component-row ${producto.tipo_limitante === 'plastico' ? 'limitante' : ''}`}>
                            <div className="component-type">
                              <span className="type-icon">💳</span>
                              <span className="type-name">Plástico (Tarjeta)</span>
                            </div>
                            <div className="component-part">{producto.producto_id}</div>
                            <div className="component-stock">
                              <span className="stock-value">{producto.plasticos_disponibles?.toLocaleString()}</span>
                              <span className="stock-label">disponibles</span>
                            </div>
                            <div className="component-status">
                              <span className="status-ok">
                                <CheckCircle size={14} />
                                Base
                              </span>
                            </div>
                          </div>

                          {/* Material Rows */}
                          {producto.componentes?.map((comp, idx) => (
                            <div
                              key={idx}
                              className={`component-row ${comp.es_limitante ? 'limitante' : ''}`}
                            >
                              <div className="component-type">
                                <span className="type-icon">{getTipoIcon(comp.tipo)}</span>
                                <span className="type-name">
                                  {getTipoLabel(comp.tipo)}
                                  {comp.es_compartido && <span className="shared-icon" title="Material compartido">🔗</span>}
                                </span>
                              </div>
                              <div className="component-part">{comp.num_parte}</div>
                              <div className="component-stock">
                                <span className="stock-value">{comp.cantidad_disponible?.toLocaleString()}</span>
                                <span className="stock-label">disponibles</span>
                              </div>
                              <div className="component-status">
                                {comp.es_limitante ? (
                                  <span className="status-deficit">
                                    <AlertTriangle size={14} />
                                    -{comp.faltante?.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="status-ok">
                                    <CheckCircle size={14} />
                                    OK
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Barra Visual de Capacidad */}
                      <div className="visual-comparison">
                        <div className="comparison-bar">
                          <div className="bar-label">Capacidad</div>
                          <div className="bar-container">
                            <div
                              className="bar-fill kits"
                              style={{
                                width: producto.plasticos_disponibles > 0
                                  ? `${Math.min((producto.capacidad_ensamble / producto.plasticos_disponibles) * 100, 100)}%`
                                  : '0%'
                              }}
                            >
                              <span>{producto.capacidad_ensamble?.toLocaleString()} kits</span>
                            </div>
                            {producto.excedente_plasticos > 0 && producto.tipo_limitante !== 'plastico' && (
                              <div
                                className="bar-fill deficit"
                                style={{
                                  width: `${(producto.excedente_plasticos / producto.plasticos_disponibles) * 100}%`
                                }}
                              >
                                <span>-{producto.excedente_plasticos?.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          <div className="bar-total">{producto.plasticos_disponibles?.toLocaleString()} plásticos</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {capacidadData.length === 0 && (
            <div className="empty-state">
              <Package size={64} />
              <h3>No hay productos configurados</h3>
              <p>Configure las relaciones entre productos y materiales para ver la capacidad de ensamble.</p>
            </div>
          )}
        </>
      )}

      {/* Tab: Análisis por Material */}
      {activeTab === 'materiales' && (
        <div className="analisis-material">
          <div className="material-selector">
            <label>Selecciona un Material</label>
            <select
              className="form-select"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              <option value="">-- Seleccionar material --</option>
              {materialesData.map(m => (
                <option key={m.num_parte} value={m.num_parte}>
                  {m.num_parte} - {m.descripcion}
                </option>
              ))}
            </select>
          </div>

          {selectedMaterial && (() => {
            const material = materialesData.find(m => m.num_parte === selectedMaterial);
            const productosQueLousan = material?.productos_relacionados || [];

            // Calcular demanda total sumando plásticos de todos los productos
            let demandaTotal = 0;
            const detalleProductos = [];

            productosQueLousan.forEach(prodId => {
              const prodCapacidad = capacidadData.find(c => c.producto_id === prodId);
              if (prodCapacidad) {
                demandaTotal += prodCapacidad.plasticos_disponibles || 0;
                detalleProductos.push({
                  id: prodId,
                  nombre: prodCapacidad.producto_nombre,
                  plasticos: prodCapacidad.plasticos_disponibles || 0
                });
              }
            });

            const disponible = material?.cantidad_disponible || material?.total_inventario || 0;
            const diferencia = disponible - demandaTotal;
            const esSuficiente = diferencia >= 0;
            const porcentajeCubierto = demandaTotal > 0 ? Math.min((disponible / demandaTotal) * 100, 100) : 100;

            return (
              <div className="material-analysis">
                {/* Header del Material */}
                <div className="material-analysis-header">
                  <div className="material-info-card">
                    <span className="material-icon-lg">{getTipoIcon(material?.tipo)}</span>
                    <div className="material-details">
                      <span className="material-num-parte">{material?.num_parte}</span>
                      <span className="material-desc">{material?.descripcion}</span>
                      <span className="material-tipo-badge">{getTipoLabel(material?.tipo)}</span>
                    </div>
                  </div>
                </div>

                {/* Resumen de Cobertura */}
                <div className={`cobertura-card ${esSuficiente ? 'success' : 'danger'}`}>
                  <div className="cobertura-header">
                    {esSuficiente ? (
                      <>
                        <CheckCircle size={24} />
                        <span>Material Suficiente</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={24} />
                        <span>Material Insuficiente</span>
                      </>
                    )}
                  </div>

                  <div className="cobertura-stats">
                    <div className="stat-box">
                      <span className="stat-label">Disponible</span>
                      <span className="stat-value positive">{disponible.toLocaleString()}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Demanda Total</span>
                      <span className="stat-value">{demandaTotal.toLocaleString()}</span>
                    </div>
                    <div className={`stat-box ${esSuficiente ? 'positive' : 'negative'}`}>
                      <span className="stat-label">{esSuficiente ? 'Excedente' : 'Faltante'}</span>
                      <span className="stat-value">{esSuficiente ? '+' : ''}{diferencia.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="cobertura-bar">
                    <div className="bar-labels">
                      <span>Cobertura: {porcentajeCubierto.toFixed(1)}%</span>
                      <span>{disponible.toLocaleString()} / {demandaTotal.toLocaleString()}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${esSuficiente ? 'success' : 'danger'}`}
                        style={{ width: `${porcentajeCubierto}%` }}
                      />
                    </div>
                  </div>

                  {/* Botón Crear Orden cuando hay material insuficiente */}
                  {!esSuficiente && (
                    <div className="cobertura-actions">
                      <button
                        className="btn btn-orden-material"
                        onClick={() => handleCrearOrdenMaterial(material, diferencia)}
                      >
                        <ShoppingCart size={18} />
                        Crear Orden de Compra
                        <span className="btn-cantidad">({Math.abs(diferencia).toLocaleString()} unidades)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Productos que usan este material */}
                <div className="productos-demanda">
                  <h4 className="section-title">
                    <CreditCard size={20} />
                    Productos que usan este material ({detalleProductos.length})
                  </h4>

                  {detalleProductos.length > 0 ? (
                    <div className="demanda-table">
                      <div className="demanda-header">
                        <div className="th">Producto</div>
                        <div className="th">Nombre</div>
                        <div className="th right">Plásticos</div>
                        <div className="th right">% Demanda</div>
                        <div className="th right">Asignación</div>
                      </div>
                      {detalleProductos.map((prod, idx) => {
                        const porcentaje = demandaTotal > 0 ? (prod.plasticos / demandaTotal) * 100 : 0;
                        const asignado = Math.min(prod.plasticos, Math.floor(disponible * (prod.plasticos / demandaTotal)));
                        const cubiertoProducto = prod.plasticos > 0 ? (asignado / prod.plasticos) * 100 : 100;

                        return (
                          <div key={idx} className="demanda-row">
                            <div className="td mono">{prod.id}</div>
                            <div className="td nombre" title={prod.nombre}>{prod.nombre}</div>
                            <div className="td right">{prod.plasticos.toLocaleString()}</div>
                            <div className="td right">{porcentaje.toFixed(1)}%</div>
                            <div className="td right">
                              {esSuficiente ? (
                                <span className="badge-ok">
                                  <CheckCircle size={12} />
                                  100%
                                </span>
                              ) : (
                                <span className={`badge-coverage ${cubiertoProducto >= 100 ? 'full' : cubiertoProducto >= 50 ? 'partial' : 'low'}`}>
                                  {cubiertoProducto.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="demanda-footer">
                        <div className="td">TOTAL</div>
                        <div className="td"></div>
                        <div className="td right bold">{demandaTotal.toLocaleString()}</div>
                        <div className="td right bold">100%</div>
                        <div className="td right">
                          {esSuficiente ? (
                            <span className="badge-ok"><CheckCircle size={12} /> OK</span>
                          ) : (
                            <span className="badge-deficit"><AlertTriangle size={12} /> Déficit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <AlertCircle size={48} />
                      <h3>Sin productos asociados</h3>
                      <p>Este material no está asignado a ningún producto.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {!selectedMaterial && (
            <div className="material-list-preview">
              <h3 className="section-title">
                <Package size={20} />
                Materiales Disponibles
              </h3>
              <p className="hint-text">Selecciona un material para analizar su cobertura</p>
              <div className="material-cards-grid">
                {materialesData.slice(0, 6).map((mat, idx) => (
                  <div
                    key={idx}
                    className="material-preview-card"
                    onClick={() => setSelectedMaterial(mat.num_parte)}
                  >
                    <span className="preview-icon">{getTipoIcon(mat.tipo)}</span>
                    <div className="preview-info">
                      <span className="preview-parte">{mat.num_parte}</span>
                      <span className="preview-desc">{mat.descripcion}</span>
                    </div>
                    <div className="preview-badge">
                      {mat.productos_relacionados?.length || 0} productos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Gestión de Inventario */}
      {activeTab === 'gestion' && (
        <div className="gestion-inventario">
          {/* Actions Bar */}
          <div className="gestion-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              Agregar Material
            </button>
            <div className="upload-section">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <Upload size={18} />
                {saving ? 'Procesando...' : 'Cargar Excel'}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por número de parte o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>
            <span className="search-results-count">
              {inventarioMateriales.filter(mat => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  mat.num_parte?.toLowerCase().includes(term) ||
                  mat.descripcion?.toLowerCase().includes(term)
                );
              }).length} de {inventarioMateriales.length} materiales
            </span>
          </div>

          {/* Info Banner */}
          <div className="info-banner">
            <FileSpreadsheet size={20} />
            <div>
              <strong>Formato de Excel:</strong> NUM_PARTE, DESCRIPCION, CANTIDAD_RECIBIDA, FECHA_ULTIMO_INGRESO, SALDO_ACTUAL, FECHA_ULTIMO_MOVIMIENTO, Total Almacén General, Total Piso Producción, TOTAL
            </div>
          </div>

          {/* Inventory Table */}
          <div className="gestion-table-container">
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Núm. Parte</th>
                  <th>Descripción</th>
                  <th>Cant. Recibida</th>
                  <th>Últ. Ingreso</th>
                  <th>Saldo Actual</th>
                  <th>Últ. Movimiento</th>
                  <th>Almacén Gral.</th>
                  <th>Piso Prod.</th>
                  <th>Total</th>
                  <th>Días S/Mov</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventarioMateriales
                  .filter(mat => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      mat.num_parte?.toLowerCase().includes(term) ||
                      mat.descripcion?.toLowerCase().includes(term)
                    );
                  })
                  .map((mat) => (
                  <tr key={mat.num_parte} className={editingRow === mat.num_parte ? 'editing' : ''}>
                    {editingRow === mat.num_parte ? (
                      <>
                        <td><input type="text" value={editData.num_parte} disabled className="input-disabled" /></td>
                        <td><input type="text" value={editData.descripcion} onChange={(e) => setEditData({...editData, descripcion: e.target.value})} /></td>
                        <td><input type="number" value={editData.cantidad_recibida} onChange={(e) => setEditData({...editData, cantidad_recibida: parseInt(e.target.value) || 0})} /></td>
                        <td><input type="text" value={editData.fecha_ultimo_ingreso} onChange={(e) => setEditData({...editData, fecha_ultimo_ingreso: e.target.value})} /></td>
                        <td><input type="number" value={editData.saldo_actual} onChange={(e) => setEditData({...editData, saldo_actual: parseInt(e.target.value) || 0})} /></td>
                        <td><input type="text" value={editData.fecha_ultimo_movimiento} onChange={(e) => setEditData({...editData, fecha_ultimo_movimiento: e.target.value})} /></td>
                        <td><input type="number" value={editData.total_almacen} onChange={(e) => setEditData({...editData, total_almacen: parseInt(e.target.value) || 0})} /></td>
                        <td><input type="number" value={editData.total_piso} onChange={(e) => setEditData({...editData, total_piso: parseInt(e.target.value) || 0})} /></td>
                        <td><input type="number" value={editData.total} onChange={(e) => setEditData({...editData, total: parseInt(e.target.value) || 0, cantidad_disponible: parseInt(e.target.value) || 0})} /></td>
                        <td><input type="number" value={editData.dias_sin_movimiento} onChange={(e) => setEditData({...editData, dias_sin_movimiento: parseInt(e.target.value) || 0})} /></td>
                        <td className="actions-cell">
                          <button className="btn-icon save" onClick={handleSaveEdit} disabled={saving}>
                            <Save size={16} />
                          </button>
                          <button className="btn-icon cancel" onClick={handleCancelEdit}>
                            <X size={16} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="mono">{mat.num_parte}</td>
                        <td className="descripcion-cell" title={mat.descripcion}>{mat.descripcion}</td>
                        <td className="number-cell">{formatNumber(mat.cantidad_recibida)}</td>
                        <td>{formatDate(mat.fecha_ultimo_ingreso)}</td>
                        <td className="number-cell">{formatNumber(mat.saldo_actual)}</td>
                        <td>{formatDate(mat.fecha_ultimo_movimiento)}</td>
                        <td className="number-cell">{formatNumber(mat.total_almacen)}</td>
                        <td className="number-cell">{formatNumber(mat.total_piso)}</td>
                        <td className="number-cell total">{formatNumber(mat.total)}</td>
                        <td className={`number-cell ${mat.dias_sin_movimiento > 90 ? 'warning' : ''}`}>
                          {mat.dias_sin_movimiento || 0}
                        </td>
                        <td className="actions-cell">
                          <button className="btn-icon edit" onClick={() => handleEdit(mat)}>
                            <Edit3 size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inventarioMateriales.length === 0 && (
            <div className="empty-state">
              <Database size={64} />
              <h3>No hay materiales en inventario</h3>
              <p>Agregue materiales manualmente o cargue un archivo Excel.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Agregar Material */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Plus size={20} /> Agregar Nuevo Material</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Número de Parte *</label>
                  <input
                    type="text"
                    value={newMaterial.num_parte}
                    onChange={(e) => setNewMaterial({...newMaterial, num_parte: e.target.value})}
                    placeholder="Ej: E14-0596-3"
                  />
                </div>
                <div className="form-group">
                  <label>Descripción *</label>
                  <input
                    type="text"
                    value={newMaterial.descripcion}
                    onChange={(e) => setNewMaterial({...newMaterial, descripcion: e.target.value})}
                    placeholder="Descripción del material"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cantidad Recibida</label>
                  <input
                    type="number"
                    value={newMaterial.cantidad_recibida}
                    onChange={(e) => setNewMaterial({...newMaterial, cantidad_recibida: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Último Ingreso</label>
                  <input
                    type="date"
                    value={newMaterial.fecha_ultimo_ingreso}
                    onChange={(e) => setNewMaterial({...newMaterial, fecha_ultimo_ingreso: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Saldo Actual</label>
                  <input
                    type="number"
                    value={newMaterial.saldo_actual}
                    onChange={(e) => setNewMaterial({...newMaterial, saldo_actual: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Último Movimiento</label>
                  <input
                    type="date"
                    value={newMaterial.fecha_ultimo_movimiento}
                    onChange={(e) => setNewMaterial({...newMaterial, fecha_ultimo_movimiento: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Almacén General</label>
                  <input
                    type="number"
                    value={newMaterial.total_almacen}
                    onChange={(e) => setNewMaterial({...newMaterial, total_almacen: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Total Piso Producción</label>
                  <input
                    type="number"
                    value={newMaterial.total_piso}
                    onChange={(e) => setNewMaterial({...newMaterial, total_piso: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Total</label>
                  <input
                    type="number"
                    value={newMaterial.total}
                    onChange={(e) => setNewMaterial({...newMaterial, total: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleAddMaterial} disabled={saving}>
                {saving ? 'Guardando...' : 'Agregar Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioMateriales;
