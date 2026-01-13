import React, { useState } from 'react';
import { Package, X, Save, Loader, Calendar } from 'lucide-react';
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

const CapturaTSYS = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const currentDate = new Date();
  const [selectedProduct, setSelectedProduct] = useState('J14968C');
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(currentDate.getFullYear());
  const [formData, setFormData] = useState({ bovedaTrabajo: '', bovedaPrincipal: '' });
  const [saving, setSaving] = useState(false);

  const inv = INVENTARIO_DATA[selectedProduct];

  // Generar años disponibles (actual y 2 anteriores)
  const aniosDisponibles = [
    currentDate.getFullYear(),
    currentDate.getFullYear() - 1,
    currentDate.getFullYear() - 2
  ];

  const handleSave = async () => {
    if (!formData.bovedaTrabajo && !formData.bovedaPrincipal) {
      toast.warning('Ingrese al menos un valor');
      return;
    }

    setSaving(true);

    try {
      // Guardar en inventario actual + historial
      await inventoryService.updateTSYS(
        selectedProduct,
        {
          boveda_trabajo: parseInt(formData.bovedaTrabajo) || 0,
          boveda_principal: parseInt(formData.bovedaPrincipal) || 0,
          trasco_rep: 0
        },
        selectedMes,
        selectedAnio
      );

      // También guardar en historial de capturas
      await captureService.create({
        producto_id: selectedProduct,
        area: 'TSYS',
        tipo: 'inventario',
        valores: {
          boveda_trabajo: parseInt(formData.bovedaTrabajo) || 0,
          boveda_principal: parseInt(formData.bovedaPrincipal) || 0,
          total_tsys: (parseInt(formData.bovedaTrabajo) || 0) + (parseInt(formData.bovedaPrincipal) || 0),
          mes: selectedMes,
          anio: selectedAnio
        }
      });

      const mesNombre = MESES.find(m => m.value === selectedMes)?.label || '';
      toast.success(`Datos guardados para ${mesNombre} ${selectedAnio}`);
      setFormData({ bovedaTrabajo: '', bovedaPrincipal: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  const total = (parseInt(formData.bovedaTrabajo) || 0) + (parseInt(formData.bovedaPrincipal) || 0);

  return (
    <div className="capture-module">
      <div className="capture-header">
        <h2>Registro de Inventario TSYS</h2>
        <p>Capture el inventario físico de las bóvedas</p>
      </div>

      <div className="capture-card tsys">
        <div className="capture-card-header">
          <Package size={28} />
          <div>
            <h3>Inventario Físico - Bóvedas</h3>
            <span>Fecha: {new Date().toLocaleDateString('es-MX')}</span>
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

          <div className="form-row">
            <div className="form-group">
              <label>Inventario Bóveda de Trabajo</label>
              <input
                type="number"
                className="form-input"
                value={formData.bovedaTrabajo}
                onChange={(e) => setFormData({...formData, bovedaTrabajo: e.target.value})}
                placeholder="Cantidad en bóveda de trabajo"
              />
              <span className="form-hint">Último registro: {inv?.tsys.bovedaTrabajo.toLocaleString()}</span>
            </div>

            <div className="form-group">
              <label>Inventario Bóveda Principal</label>
              <input
                type="number"
                className="form-input"
                value={formData.bovedaPrincipal}
                onChange={(e) => setFormData({...formData, bovedaPrincipal: e.target.value})}
                placeholder="Cantidad en bóveda principal"
              />
              <span className="form-hint">Último registro: {inv?.tsys.bovedaPrincipal.toLocaleString()}</span>
            </div>
          </div>

          <div className="form-summary">
            <span>Total TSYS:</span>
            <span className="summary-value">{total.toLocaleString()}</span>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setFormData({ bovedaTrabajo: '', bovedaPrincipal: '' })}>
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

export default CapturaTSYS;
