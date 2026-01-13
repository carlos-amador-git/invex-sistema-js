import React, { useState } from 'react';
import { Building2, X, Save, Loader, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PRODUCTOS } from '../../data/productos';
import { INVENTARIO_DATA } from '../../data/inventario';
import { captureService } from '../../services/captureService';
import { inventoryService } from '../../services/inventoryService';
import './Capturas.css';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

const CapturaDistribucion = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const currentDate = new Date();
  const [selectedProduct, setSelectedProduct] = useState('J14968C');
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(currentDate.getFullYear());
  const [formData, setFormData] = useState({
    colocacion: '',
    colocacionNormal: '',
    devoluciones: '',
    stockSeguridad: ''
  });
  const [saving, setSaving] = useState(false);

  const inv = INVENTARIO_DATA[selectedProduct];

  const aniosDisponibles = [
    currentDate.getFullYear(),
    currentDate.getFullYear() - 1,
    currentDate.getFullYear() - 2
  ];

  const handleSave = async () => {
    if (!formData.colocacion && !formData.colocacionNormal && !formData.devoluciones && !formData.stockSeguridad) {
      toast.warning('Ingrese al menos un valor');
      return;
    }

    setSaving(true);

    try {
      // Guardar en inventario actual + historial
      await inventoryService.updateDistribucion(
        selectedProduct,
        {
          dist_colocacion: parseInt(formData.colocacion) || 0,
          dist_normal: parseInt(formData.colocacionNormal) || 0,
          dist_devoluciones: parseInt(formData.devoluciones) || 0,
          stock_seguridad_modulos: parseInt(formData.stockSeguridad) || null
        },
        selectedMes,
        selectedAnio
      );

      // También guardar en historial de capturas
      await captureService.create({
        producto_id: selectedProduct,
        area: 'Distribucion',
        tipo: 'demanda',
        valores: {
          colocacion: parseInt(formData.colocacion) || 0,
          colocacion_normal: parseInt(formData.colocacionNormal) || 0,
          devoluciones: parseInt(formData.devoluciones) || 0,
          stock_seguridad: parseInt(formData.stockSeguridad) || 0,
          total_operativo: (parseInt(formData.colocacion) || 0) + (parseInt(formData.colocacionNormal) || 0) + (parseInt(formData.devoluciones) || 0),
          mes: selectedMes,
          anio: selectedAnio
        }
      });

      const mesNombre = MESES.find(m => m.value === selectedMes)?.label || '';
      toast.success(`Datos guardados para ${mesNombre} ${selectedAnio}`);
      setFormData({ colocacion: '', colocacionNormal: '', devoluciones: '', stockSeguridad: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="capture-module">
      <div className="capture-header">
        <h2>Registro de Demanda - Distribución</h2>
        <p>Capture los datos de colocación y emisiones del área de Distribución</p>
      </div>

      <div className="capture-card distribucion">
        <div className="capture-card-header">
          <Building2 size={28} />
          <div>
            <h3>Demanda Área de Distribución</h3>
            <span>Período: {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="capture-form">
          <div className="form-group">
            <label>Producto (Item Number)</label>
            <select
              className="form-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              {PRODUCTOS.map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selectores de Mes y Año */}
          <div className="form-row periodo-row">
            <div className="form-group">
              <label><Calendar size={14} /> Mes del Registro</label>
              <select
                className="form-select"
                value={selectedMes}
                onChange={(e) => setSelectedMes(parseInt(e.target.value))}
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Año</label>
              <select
                className="form-select"
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(parseInt(e.target.value))}
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campos de Demanda */}
          <div className="form-section-title">Datos de Demanda</div>
          <div className="form-row three">
            <div className="form-group">
              <label>Colocación Mensual</label>
              <input
                type="number"
                className="form-input"
                value={formData.colocacion}
                onChange={(e) => setFormData({...formData, colocacion: e.target.value})}
                placeholder="Cantidad colocada"
              />
              <span className="form-hint">Anterior: {inv?.distribucion.colocacion.toLocaleString()}</span>
            </div>

            <div className="form-group">
              <label>Colocación Normal</label>
              <input
                type="number"
                className="form-input"
                value={formData.colocacionNormal}
                onChange={(e) => setFormData({...formData, colocacionNormal: e.target.value})}
                placeholder="Colocación normal"
              />
              <span className="form-hint">Anterior: {inv?.distribucion.normal?.toLocaleString() || '0'}</span>
            </div>

            <div className="form-group">
              <label>Devoluciones</label>
              <input
                type="number"
                className="form-input"
                value={formData.devoluciones}
                onChange={(e) => setFormData({...formData, devoluciones: e.target.value})}
                placeholder="Devoluciones"
              />
              <span className="form-hint">Anterior: {inv?.distribucion.devoluciones.toLocaleString()}</span>
            </div>
          </div>

          {/* Stock de Seguridad */}
          <div className="form-section-title">Stock de Seguridad</div>
          <div className="form-row">
            <div className="form-group">
              <label>Stock de Seguridad (para Módulos)</label>
              <input
                type="number"
                className="form-input"
                value={formData.stockSeguridad}
                onChange={(e) => setFormData({...formData, stockSeguridad: e.target.value})}
                placeholder="Stock de seguridad"
              />
              <span className="form-hint">Anterior: {inv?.modulos.stock.toLocaleString()}</span>
            </div>
            <div className="form-group">
              <div className="form-note warning inline">
                <AlertTriangle size={16} />
                <span>Este valor será visible para el área de Módulos</span>
              </div>
            </div>
          </div>

          <div className="form-summary">
            <div>
              <span className="summary-label">Total Operativo Distribución</span>
              <span className="summary-detail">Colocación + Colocación Normal + Devoluciones</span>
            </div>
            <span className="summary-value">
              {(
                (parseInt(formData.colocacion) || 0) +
                (parseInt(formData.colocacionNormal) || 0) +
                (parseInt(formData.devoluciones) || 0)
              ).toLocaleString()}
            </span>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setFormData({ colocacion: '', colocacionNormal: '', devoluciones: '', stockSeguridad: '' })}>
              <X size={18} />
              Limpiar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader size={18} className="spin" /> : <Save size={18} />}
              {saving ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
        </div>
      </div>

      <div className="audit-info">
        <p>
          <strong>Usuario:</strong> {currentUser?.nombre} | 
          <strong> Fecha/Hora:</strong> {new Date().toLocaleString('es-MX')}
        </p>
      </div>
    </div>
  );
};

export default CapturaDistribucion;
