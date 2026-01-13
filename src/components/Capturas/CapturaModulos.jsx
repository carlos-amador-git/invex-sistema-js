import React, { useState } from 'react';
import { CreditCard, X, Save, AlertTriangle, Loader, Info, Calendar } from 'lucide-react';
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

const CapturaModulos = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const currentDate = new Date();
  const [selectedProduct, setSelectedProduct] = useState('J14968C');
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(currentDate.getFullYear());
  const [formData, setFormData] = useState({ colocacion: '', colocacionNormal: '' });
  const [saving, setSaving] = useState(false);

  const inv = INVENTARIO_DATA[selectedProduct];

  const aniosDisponibles = [
    currentDate.getFullYear(),
    currentDate.getFullYear() - 1,
    currentDate.getFullYear() - 2
  ];

  // Calcular total operativo (incluye stock de seguridad)
  const stockSeguridad = inv?.modulos.stock || 0;
  const totalOperativo = (parseInt(formData.colocacion) || 0) + (parseInt(formData.colocacionNormal) || 0) + stockSeguridad;

  const handleSave = async () => {
    if (!formData.colocacion && !formData.colocacionNormal) {
      toast.warning('Ingrese al menos un valor de colocación');
      return;
    }

    setSaving(true);

    try {
      // Guardar en inventario actual + historial
      await inventoryService.updateModulos(
        selectedProduct,
        {
          mod_colocacion: parseInt(formData.colocacion) || 0,
          mod_normal: parseInt(formData.colocacionNormal) || 0,
          mod_stock: stockSeguridad
        },
        selectedMes,
        selectedAnio
      );

      // También guardar en historial de capturas
      await captureService.create({
        producto_id: selectedProduct,
        area: 'Modulos',
        tipo: 'demanda',
        valores: {
          colocacion: parseInt(formData.colocacion) || 0,
          colocacion_normal: parseInt(formData.colocacionNormal) || 0,
          total_operativo: totalOperativo,
          mes: selectedMes,
          anio: selectedAnio
        }
      });

      const mesNombre = MESES.find(m => m.value === selectedMes)?.label || '';
      toast.success(`Datos guardados para ${mesNombre} ${selectedAnio}`);
      setFormData({ colocacion: '', colocacionNormal: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="capture-module">
      <div className="capture-header">
        <h2>Registro de Datos - Módulos</h2>
        <p>Capture los datos de colocación del área de Módulos</p>
      </div>

      <div className="capture-card modulos">
        <div className="capture-card-header">
          <CreditCard size={28} />
          <div>
            <h3>Datos Área de Módulos</h3>
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

          {/* Campos de Colocación */}
          <div className="form-section-title">Datos de Colocación</div>
          <div className="form-row">
            <div className="form-group">
              <label>Colocación Mensual</label>
              <input
                type="number"
                className="form-input"
                value={formData.colocacion}
                onChange={(e) => setFormData({...formData, colocacion: e.target.value})}
                placeholder="Cantidad colocada"
              />
              <span className="form-hint">Anterior: {inv?.modulos.colocacion?.toLocaleString() || '0'}</span>
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
              <span className="form-hint">Anterior: {inv?.modulos.colocacionNormal?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* Resumen */}
          <div className="form-summary">
            <div>
              <span className="summary-label">Total Operativo Módulos</span>
              <span className="summary-detail">Colocación Mensual + Colocación Normal + Stock de Seguridad</span>
            </div>
            <span className="summary-value">{totalOperativo.toLocaleString()}</span>
          </div>

          {/* Stock de Seguridad (solo lectura) */}
          <div className="form-section-title">Stock de Seguridad</div>
          <div className="form-row">
            <div className="form-group">
              <label>Stock de Seguridad</label>
              <div className="readonly-field">
                <span className="readonly-value">{inv?.modulos.stock?.toLocaleString() || '0'}</span>
              </div>
              <span className="form-hint">Definido por el área de Distribución</span>
            </div>
            <div className="form-group">
              <div className="form-note info inline">
                <Info size={16} />
                <span>Este valor es capturado por Distribución</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setFormData({ colocacion: '', colocacionNormal: '' })}>
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

export default CapturaModulos;
