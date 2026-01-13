import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, Plus, RefreshCw, Upload, X, Save, Trash2, History, Edit2,
  FileSpreadsheet, AlertCircle, CheckCircle, DollarSign, CreditCard,
  ChevronDown, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { procesosBAUService, presupuestosService } from '../../services/procesosBAUService';
import { productService } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './ProcesosBAU.css';

const TIPOS_PROCESO = [
  { value: 'trascodificacion', label: 'Trascodificación', short: 'Trasco', color: '#3b82f6' },
  { value: 'btb', label: 'Bank to Bank', short: 'BTB', color: '#10b981' },
  { value: 'renovacion_anticipada', label: 'Renovación Anticipada', short: 'Renov', color: '#f59e0b' }
];

const MESES = [
  { value: 1, label: 'Enero', short: 'Ene' },
  { value: 2, label: 'Febrero', short: 'Feb' },
  { value: 3, label: 'Marzo', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Mayo', short: 'May' },
  { value: 6, label: 'Junio', short: 'Jun' },
  { value: 7, label: 'Julio', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Septiembre', short: 'Sep' },
  { value: 10, label: 'Octubre', short: 'Oct' },
  { value: 11, label: 'Noviembre', short: 'Nov' },
  { value: 12, label: 'Diciembre', short: 'Dic' }
];

const ProcesosBAU = () => {
  // Data state
  const [procesos, setProcesos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProceso, setEditingProceso] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProductId, setUploadProductId] = useState('');
  const [uploadPreview, setUploadPreview] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [selectedProcesoForHistory, setSelectedProcesoForHistory] = useState(null);
  const [showPresupuestosModal, setShowPresupuestosModal] = useState(false);
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({ codigo: '', descripcion: '' });
  const [savingPresupuesto, setSavingPresupuesto] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const fileInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    producto_id: '', tipo_proceso: '', mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(), cantidad: 0, presupuesto_id: ''
  });

  const toast = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [procesosData, productosData, presupuestosData] = await Promise.all([
        procesosBAUService.getAll(),
        productService.getAll(),
        presupuestosService.getAll()
      ]);
      setProcesos(procesosData);
      setProductos(productosData);
      setPresupuestos(presupuestosData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Get years with data
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear, currentYear + 1]);
    procesos.forEach(p => years.add(p.anio));
    return Array.from(years).sort((a, b) => b - a);
  };

  // Get products with BAU data for selected year (returns Set of IDs)
  const getProductIdsWithDataForYear = () => {
    return new Set(procesos.filter(p => p.anio === selectedAnio).map(p => p.producto_id));
  };

  // Get products with ANY BAU data (returns Set of IDs)
  const getProductIdsWithAnyData = () => {
    return new Set(procesos.map(p => p.producto_id));
  };

  // Get data for selected product and year
  const getProductData = () => {
    if (!selectedProductId) return [];
    return procesos.filter(p => p.producto_id === selectedProductId && p.anio === selectedAnio);
  };

  // Build table data (months x types)
  const buildTableData = () => {
    const data = getProductData();
    const tableData = {};

    MESES.forEach(mes => {
      tableData[mes.value] = {
        mes: mes.value,
        mesLabel: mes.label,
        mesShort: mes.short,
        trascodificacion: null,
        btb: null,
        renovacion_anticipada: null
      };
    });

    data.forEach(p => {
      if (tableData[p.mes]) {
        tableData[p.mes][p.tipo_proceso] = p;
      }
    });

    return Object.values(tableData);
  };

  // Calculate totals for selected product
  const calcularTotales = () => {
    const data = getProductData();
    const totals = { trascodificacion: 0, btb: 0, renovacion_anticipada: 0, total: 0 };
    data.forEach(p => {
      totals[p.tipo_proceso] = (totals[p.tipo_proceso] || 0) + p.cantidad;
      totals.total += p.cantidad;
    });
    return totals;
  };

  // Get selected product info
  const getSelectedProduct = () => productos.find(p => p.id === selectedProductId);

  // Handle cell click to edit
  const handleCellClick = (mes, tipo) => {
    const proceso = buildTableData().find(row => row.mes === mes)?.[tipo];
    if (proceso) {
      handleOpenModal(proceso);
    } else {
      // Create new
      setEditingProceso(null);
      setFormData({
        producto_id: selectedProductId,
        tipo_proceso: tipo,
        mes: mes,
        anio: selectedAnio,
        cantidad: 0,
        presupuesto_id: ''
      });
      setShowModal(true);
    }
  };

  const handleOpenModal = (proceso = null) => {
    if (proceso) {
      setEditingProceso(proceso);
      setFormData({
        producto_id: proceso.producto_id,
        tipo_proceso: proceso.tipo_proceso,
        mes: proceso.mes,
        anio: proceso.anio,
        cantidad: proceso.cantidad,
        presupuesto_id: proceso.presupuesto_id || ''
      });
    } else {
      setEditingProceso(null);
      setFormData({
        producto_id: selectedProductId || '',
        tipo_proceso: '',
        mes: new Date().getMonth() + 1,
        anio: selectedAnio,
        cantidad: 0,
        presupuesto_id: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.producto_id || !formData.tipo_proceso) {
      toast.warning('Selecciona un producto y tipo de proceso');
      return;
    }
    setSaving(true);
    try {
      if (editingProceso) {
        await procesosBAUService.update(editingProceso.id, {
          cantidad: formData.cantidad,
          presupuesto_id: formData.presupuesto_id || null
        });
        toast.success('Registro actualizado');
      } else {
        await procesosBAUService.create({
          ...formData,
          presupuesto_id: formData.presupuesto_id || null
        });
        toast.success('Registro creado');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (proceso) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar este registro?',
      message: `Se eliminará ${getTipoLabel(proceso.tipo_proceso)} de ${MESES[proceso.mes - 1].label}/${proceso.anio}`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await procesosBAUService.delete(proceso.id);
          toast.success('Registro eliminado');
          loadData();
        } catch (err) {
          toast.error('Error al eliminar');
        }
      }
    });
  };

  const handleViewHistory = async (proceso) => {
    setSelectedProcesoForHistory(proceso);
    setLoadingHistorial(true);
    setShowHistoryModal(true);
    try {
      const data = await procesosBAUService.getHistorial(proceso.id);
      setHistorial(data);
    } catch (err) {
      toast.error('Error al cargar historial');
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Excel parsing functions
  const parseMonth = (monthStr) => {
    if (!monthStr) return null;
    const str = String(monthStr).trim().toLowerCase();
    const spanishMonths = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };
    if (spanishMonths[str]) return { mes: spanishMonths[str], anio: null };
    const abbrevMatch = str.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2})$/i);
    if (abbrevMatch) {
      const englishMonths = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 };
      return { mes: englishMonths[abbrevMatch[1].toLowerCase()], anio: 2000 + parseInt(abbrevMatch[2]) };
    }
    const num = parseInt(str);
    if (num >= 1 && num <= 12) return { mes: num, anio: null };
    return null;
  };

  const extractPresupuesto = (header) => {
    if (!header) return null;
    const parts = String(header).trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (/^(PYM|ADQ|PRE)/i.test(last)) return last.toUpperCase();
    return null;
  };

  const identifyColumnType = (header) => {
    if (!header) return null;
    const h = String(header).toLowerCase();
    if (h.includes('trasco') || h.includes('rep')) return 'trascodificacion';
    if (h.includes('btb') || h.includes('bank')) return 'btb';
    if (h.includes('renov') || h.includes('anticipada')) return 'renovacion_anticipada';
    return null;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!uploadProductId) {
      toast.warning('Selecciona primero un ITEM/Producto');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (jsonData.length < 2) { toast.error('El archivo está vacío'); return; }

      const headers = jsonData[0].map(h => String(h || '').toLowerCase().trim());

      // Detect column indices
      let anioColIndex = -1;
      let mesColIndex = -1;
      const dataColumns = [];

      headers.forEach((h, i) => {
        if (h === 'año' || h === 'anio' || h === 'year') {
          anioColIndex = i;
        } else if (h === 'mes' || h === 'month') {
          mesColIndex = i;
        } else {
          const tipo = identifyColumnType(h);
          const presupuesto = extractPresupuesto(jsonData[0][i]);
          if (tipo) dataColumns.push({ index: i, tipo, presupuesto, header: jsonData[0][i] });
        }
      });

      // If no explicit MES column, assume first column is month (old format)
      if (mesColIndex === -1) mesColIndex = 0;

      if (dataColumns.length === 0) { toast.error('No se encontraron columnas de datos válidas (Trasco, BTB, Renov)'); return; }

      const defaultAnio = new Date().getFullYear();
      const parsedData = [];

      for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || row.length === 0) continue;

        // Get year from Año column or from month format or default
        let rowAnio = defaultAnio;
        if (anioColIndex >= 0 && row[anioColIndex]) {
          rowAnio = parseInt(row[anioColIndex]) || defaultAnio;
        }

        // Get month
        const monthData = parseMonth(row[mesColIndex]);
        if (!monthData) continue;

        // If month format included year (like "Jan-26"), use it; otherwise use row year
        const finalAnio = monthData.anio || rowAnio;

        for (const col of dataColumns) {
          const value = row[col.index];
          const cantidad = typeof value === 'number' ? Math.round(value) : parseInt(String(value).replace(/,/g, '')) || 0;
          parsedData.push({
            producto_id: uploadProductId,
            tipo_proceso: col.tipo,
            mes: monthData.mes,
            anio: finalAnio,
            cantidad,
            presupuesto_codigo: col.presupuesto,
            _display: { mesLabel: MESES[monthData.mes - 1]?.label, tipoLabel: getTipoLabel(col.tipo), anio: finalAnio }
          });
        }
      }
      if (parsedData.length === 0) { toast.warning('No se encontraron datos válidos'); return; }
      setUploadPreview({ columns: dataColumns, data: parsedData, totalRows: jsonData.length - 1 });
    } catch (err) {
      console.error('Error parsing Excel:', err);
      toast.error('Error al leer el archivo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreview?.data?.length) return;
    setUploading(true);
    try {
      const result = await procesosBAUService.uploadBatch(uploadPreview.data);
      setUploadResult(result);
      setUploadPreview(null);
      toast.success(`Importación completada: ${result.creados} creados, ${result.actualizados} actualizados`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al importar');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadProductId('');
    setUploadPreview(null);
    setUploadResult(null);
  };

  const handleCreatePresupuesto = async () => {
    if (!nuevoPresupuesto.codigo.trim()) { toast.warning('El código es requerido'); return; }
    setSavingPresupuesto(true);
    try {
      await presupuestosService.create(nuevoPresupuesto);
      toast.success(`Presupuesto ${nuevoPresupuesto.codigo} creado`);
      setNuevoPresupuesto({ codigo: '', descripcion: '' });
      const data = await presupuestosService.getAll();
      setPresupuestos(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear');
    } finally {
      setSavingPresupuesto(false);
    }
  };

  const getTipoLabel = (tipo) => TIPOS_PROCESO.find(t => t.value === tipo)?.label || tipo;
  const getTipoColor = (tipo) => TIPOS_PROCESO.find(t => t.value === tipo)?.color || '#666';
  const getPresupuestoCodigo = (id) => presupuestos.find(p => p.id === id)?.codigo || '';

  const productIdsWithDataForYear = getProductIdsWithDataForYear();
  const productIdsWithAnyData = getProductIdsWithAnyData();
  const tableData = buildTableData();
  const totals = calcularTotales();
  const selectedProduct = getSelectedProduct();

  if (loading) {
    return (
      <div className="pbau-loading">
        <RefreshCw size={32} className="spin" />
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="pbau-wrapper">
      {/* Header */}
      <div className="pbau-header">
        <div className="pbau-header-info">
          <div className="pbau-header-icon"><Layers size={28} /></div>
          <div>
            <h2>Procesos BAU</h2>
            <p>Trascodificación, Bank to Bank y Renovación Anticipada</p>
          </div>
        </div>
        <div className="pbau-header-actions">
          <button className="btn-icon" onClick={loadData} title="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button className="btn-secondary" onClick={() => setShowPresupuestosModal(true)}>
            <DollarSign size={18} /> Presupuestos
          </button>
          <button className="btn-secondary" onClick={() => setShowUploadModal(true)}>
            <Upload size={18} /> Cargar Excel
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Nuevo Registro
          </button>
        </div>
      </div>

      {/* Product Selector */}
      <div className="pbau-product-section">
        <div className="section-header">
          <CreditCard size={18} />
          <span>Seleccionar Producto</span>
          <div className="year-selector">
            <Calendar size={16} />
            <select
              className="year-select"
              value={selectedAnio}
              onChange={e => setSelectedAnio(parseInt(e.target.value))}
            >
              {getYears().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={16} className="year-chevron" />
          </div>
        </div>

        <div className="product-selector-grid">
          {productos.length > 0 ? (
            productos.map(p => {
              const hasDataForYear = productIdsWithDataForYear.has(p.id);
              const hasAnyData = productIdsWithAnyData.has(p.id);
              return (
                <button
                  key={p.id}
                  className={`product-card ${selectedProductId === p.id ? 'selected' : ''} ${hasDataForYear ? 'has-data' : hasAnyData ? 'has-other-data' : ''}`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <span className="product-id">{p.id}</span>
                  <span className="product-name">{p.nombre}</span>
                  {hasDataForYear && <span className="product-badge">{selectedAnio}</span>}
                  {!hasDataForYear && hasAnyData && <span className="product-badge other">Otro año</span>}
                </button>
              );
            })
          ) : (
            <p className="no-data-hint">No hay productos en el catálogo</p>
          )}
        </div>
      </div>

      {/* Data Display */}
      {selectedProductId && selectedProduct && (
        <div className="pbau-data-section">
          {/* Product Banner */}
          <div className="product-banner">
            <div className="banner-info">
              <span className="banner-id">{selectedProduct.id}</span>
              <span className="banner-name">{selectedProduct.nombre}</span>
            </div>
            <div className="banner-stats">
              {TIPOS_PROCESO.map(tipo => (
                <div key={tipo.value} className="banner-stat" style={{ borderColor: tipo.color }}>
                  <span className="stat-label">{tipo.short}</span>
                  <span className="stat-value">{totals[tipo.value]?.toLocaleString() || 0}</span>
                </div>
              ))}
              <div className="banner-stat total">
                <span className="stat-label">Total</span>
                <span className="stat-value">{totals.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="pbau-table-container">
            <table className="pbau-data-table">
              <thead>
                <tr>
                  <th className="col-mes">Mes</th>
                  {TIPOS_PROCESO.map(tipo => (
                    <th key={tipo.value} style={{ borderTopColor: tipo.color }}>
                      <span className="tipo-header" style={{ color: tipo.color }}>{tipo.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map(row => (
                  <tr key={row.mes}>
                    <td className="col-mes">
                      <span className="mes-label">{row.mesLabel}</span>
                      <span className="mes-year">{selectedAnio}</span>
                    </td>
                    {TIPOS_PROCESO.map(tipo => {
                      const proceso = row[tipo.value];
                      return (
                        <td
                          key={tipo.value}
                          className={`col-data ${proceso ? 'has-data' : 'empty'}`}
                          onClick={() => handleCellClick(row.mes, tipo.value)}
                        >
                          {proceso ? (
                            <div className="cell-content">
                              <span className="cell-value">{proceso.cantidad.toLocaleString()}</span>
                              {proceso.presupuesto_id && (
                                <span className="cell-presupuesto">{getPresupuestoCodigo(proceso.presupuesto_id)}</span>
                              )}
                              <div className="cell-actions">
                                <button onClick={(e) => { e.stopPropagation(); handleViewHistory(proceso); }} title="Historial">
                                  <History size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(proceso); }} title="Eliminar">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="cell-empty">
                              <Plus size={16} />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no product selected */}
      {!selectedProductId && productos.length > 0 && (
        <div className="pbau-empty-state">
          <Calendar size={48} />
          <h3>Selecciona un producto</h3>
          <p>Elige un producto de la lista para ver sus datos BAU</p>
        </div>
      )}

      {/* Modal: Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProceso ? 'Editar Registro' : 'Nuevo Registro'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Producto *</label>
                  <select value={formData.producto_id} onChange={e => setFormData({ ...formData, producto_id: e.target.value })} disabled={editingProceso}>
                    <option value="">Seleccionar...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Proceso *</label>
                  <select value={formData.tipo_proceso} onChange={e => setFormData({ ...formData, tipo_proceso: e.target.value })} disabled={editingProceso}>
                    <option value="">Seleccionar...</option>
                    {TIPOS_PROCESO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Mes *</label>
                  <select value={formData.mes} onChange={e => setFormData({ ...formData, mes: parseInt(e.target.value) })} disabled={editingProceso}>
                    {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Año *</label>
                  <select value={formData.anio} onChange={e => setFormData({ ...formData, anio: parseInt(e.target.value) })} disabled={editingProceso}>
                    {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cantidad</label>
                  <input type="number" min="0" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Presupuesto</label>
                  <select value={formData.presupuesto_id} onChange={e => setFormData({ ...formData, presupuesto_id: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {presupuestos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSubmit} disabled={saving}>
                <Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upload Excel */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={handleCloseUploadModal}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FileSpreadsheet size={20} /> Cargar desde Excel</h3>
              <button className="modal-close" onClick={handleCloseUploadModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="upload-step">
                <div className="step-header"><span className="step-number">1</span><span className="step-title">Seleccionar Producto</span></div>
                <select value={uploadProductId} onChange={e => { setUploadProductId(e.target.value); setUploadPreview(null); setUploadResult(null); }} className="upload-select">
                  <option value="">-- Seleccionar producto --</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>)}
                </select>
              </div>
              <div className={`upload-step ${!uploadProductId ? 'disabled' : ''}`}>
                <div className="step-header"><span className="step-number">2</span><span className="step-title">Seleccionar Archivo</span></div>
                <div className="upload-info">
                  <p>Formato: Año | MES | Trasco/Rep PYM01 | BTB PYM01 | Renov Anticipada PYM01</p>
                </div>
                <input type="file" ref={fileInputRef} accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileSelect} style={{ display: 'none' }} />
                <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={!uploadProductId || uploading}>
                  <Upload size={20} /> Seleccionar Archivo
                </button>
              </div>
              {uploadPreview && (
                <div className="upload-step">
                  <div className="step-header"><span className="step-number">3</span><span className="step-title">Vista Previa</span><span className="preview-count">{uploadPreview.data.length} registros</span></div>
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead><tr><th>Mes</th><th>Año</th><th>Tipo</th><th>Cantidad</th><th>Presupuesto</th></tr></thead>
                      <tbody>
                        {uploadPreview.data.slice(0, 15).map((row, i) => (
                          <tr key={i}><td>{row._display.mesLabel}</td><td>{row.anio}</td><td>{row._display.tipoLabel}</td><td className="num">{row.cantidad.toLocaleString()}</td><td>{row.presupuesto_codigo || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadPreview.data.length > 15 && <p className="preview-more">... y {uploadPreview.data.length - 15} más</p>}
                  </div>
                </div>
              )}
              {uploadResult && (
                <div className={`upload-result ${uploadResult.errores > 0 ? 'has-errors' : 'success'}`}>
                  <div className="result-stats">
                    <span className="stat success"><CheckCircle size={16} /> {uploadResult.creados} creados</span>
                    <span className="stat info"><RefreshCw size={16} /> {uploadResult.actualizados} actualizados</span>
                    {uploadResult.errores > 0 && <span className="stat error"><AlertCircle size={16} /> {uploadResult.errores} errores</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseUploadModal}>{uploadResult ? 'Cerrar' : 'Cancelar'}</button>
              {uploadPreview && !uploadResult && (
                <button className="btn-save" onClick={handleConfirmUpload} disabled={uploading}>
                  <Save size={18} /> {uploading ? 'Importando...' : `Importar ${uploadPreview.data.length} registros`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: History */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><History size={20} /> Historial de Cambios</h3>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {selectedProcesoForHistory && (
                <p className="history-context">{getTipoLabel(selectedProcesoForHistory.tipo_proceso)} - {MESES[selectedProcesoForHistory.mes - 1].label}/{selectedProcesoForHistory.anio}</p>
              )}
              {loadingHistorial ? <p>Cargando...</p> : historial.length === 0 ? <p className="no-history">Sin cambios registrados</p> : (
                <table className="history-table">
                  <thead><tr><th>Fecha</th><th>Anterior</th><th>Nuevo</th><th>Usuario</th></tr></thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id}>
                        <td>{new Date(h.fecha).toLocaleString()}</td>
                        <td>{h.cantidad_anterior?.toLocaleString()}</td>
                        <td>{h.cantidad_nueva?.toLocaleString()}</td>
                        <td>{h.usuario_nombre || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHistoryModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Presupuestos */}
      {showPresupuestosModal && (
        <div className="modal-overlay" onClick={() => setShowPresupuestosModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><DollarSign size={20} /> Gestión de Presupuestos</h3>
              <button className="modal-close" onClick={() => setShowPresupuestosModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="presupuesto-form">
                <input type="text" placeholder="Código (ej: PYM01)" value={nuevoPresupuesto.codigo} onChange={e => setNuevoPresupuesto({ ...nuevoPresupuesto, codigo: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Descripción (opcional)" value={nuevoPresupuesto.descripcion} onChange={e => setNuevoPresupuesto({ ...nuevoPresupuesto, descripcion: e.target.value })} />
                <button className="btn-primary" onClick={handleCreatePresupuesto} disabled={savingPresupuesto}>
                  <Plus size={18} /> {savingPresupuesto ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
              <div className="presupuestos-list">
                {presupuestos.map(p => (
                  <div key={p.id} className="presupuesto-item">
                    <div className="presupuesto-info">
                      <strong>{p.codigo}</strong>
                      {p.descripcion && <span>{p.descripcion}</span>}
                    </div>
                    <button className="btn-action danger" onClick={() => {
                      setConfirmModal({
                        isOpen: true, title: '¿Desactivar presupuesto?',
                        message: `El presupuesto "${p.codigo}" será desactivado`,
                        confirmLabel: 'Sí, desactivar', variant: 'warning',
                        onConfirm: async () => {
                          try { await presupuestosService.delete(p.id); toast.success('Desactivado'); const data = await presupuestosService.getAll(); setPresupuestos(data); }
                          catch { toast.error('Error'); }
                        }
                      });
                    }} title="Desactivar"><Trash2 size={16} /></button>
                  </div>
                ))}
                {presupuestos.length === 0 && <p className="no-presupuestos">No hay presupuestos registrados</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowPresupuestosModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmModal} onClose={() => setConfirmModal({ isOpen: false })} />
    </div>
  );
};

export default ProcesosBAU;
