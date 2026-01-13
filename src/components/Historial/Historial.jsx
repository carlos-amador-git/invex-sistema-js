import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { captureService } from '../../services/captureService';

const Historial = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await captureService.getMyCapturas();
      setRegistros(data);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar el historial');
      toast.error('Error al cargar el historial de capturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistorial();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const MESES_NOMBRES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
  };

  const formatValores = (valores) => {
    if (!valores) return null;
    return Object.entries(valores).map(([key, val]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let value;
      // Convertir número de mes a nombre
      if (key.toLowerCase() === 'mes' && typeof val === 'number') {
        value = MESES_NOMBRES[val] || val;
      } else {
        value = typeof val === 'number' ? val.toLocaleString() : val;
      }
      return { label, value };
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
        <span>Cargando historial...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
        <AlertCircle size={48} style={{ color: '#ef4444' }} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadHistorial}>Reintentar</button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Mi Historial de Capturas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadHistorial}>
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button className="btn btn-secondary btn-sm">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Producto</th>
              <th>Área</th>
              <th>Tipo</th>
              <th>Valores Capturados</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>
            {registros.length > 0 ? registros.map(registro => (
              <tr key={registro.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(registro.fecha)}</td>
                <td style={{ fontFamily: 'JetBrains Mono', color: '#3b82f6', fontWeight: 600 }}>
                  {registro.producto_id}
                </td>
                <td>{registro.area}</td>
                <td>{registro.tipo}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>
                  {formatValores(registro.valores)?.map(({ label, value }) => (
                    <div key={label}>{label}: {value}</div>
                  ))}
                </td>
                <td>
                  <span className={`status-badge ${registro.estatus === 'Aprobado' ? 'success' : 'warning'}`}>
                    <CheckCircle size={12} />
                    {registro.estatus}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  No hay registros para mostrar. Las capturas que realices aparecerán aquí.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Historial;
