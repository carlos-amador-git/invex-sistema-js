import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import { RefreshCw, Calendar, TrendingUp, TrendingDown, Minus, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { inventarioHistorialService } from '../../services';
import './InventarioHistorial.css';

const MES_ABREV = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
};

const AREAS = {
  tsys: {
    nombre: 'TSYS',
    campos: [
      { key: 'boveda_trabajo', label: 'Bov. Trabajo', color: '#3b82f6' },
      { key: 'boveda_principal', label: 'Bov. Principal', color: '#10b981' },
      { key: 'trasco_rep', label: 'Trasco/Rep', color: '#f59e0b' }
    ]
  },
  distribucion: {
    nombre: 'Distribucion',
    campos: [
      { key: 'dist_colocacion', label: 'Colocacion', color: '#8b5cf6' },
      { key: 'dist_normal', label: 'Normal', color: '#06b6d4' },
      { key: 'dist_devoluciones', label: 'Devoluciones', color: '#ef4444' }
    ]
  },
  modulos: {
    nombre: 'Modulos',
    campos: [
      { key: 'mod_colocacion', label: 'Colocacion', color: '#ec4899' },
      { key: 'mod_normal', label: 'Normal', color: '#14b8a6' },
      { key: 'mod_stock', label: 'Stock Seg.', color: '#f97316' }
    ]
  }
};

const InventarioHistorial = ({ productoId, productoNombre }) => {
  const [areaActiva, setAreaActiva] = useState('tsys');
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [comparativo, setComparativo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vistaGrafica, setVistaGrafica] = useState(true);

  const cargarDatos = useCallback(async () => {
    if (!productoId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await inventarioHistorialService.getComparativo(
        productoId,
        areaActiva,
        anioSeleccionado
      );
      setComparativo(data);
    } catch (err) {
      console.error('Error cargando comparativo:', err);
      setError('Error al cargar datos comparativos');
    } finally {
      setLoading(false);
    }
  }, [productoId, areaActiva, anioSeleccionado]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const getIconoVariacion = (variacion) => {
    if (variacion === null || variacion === undefined) return <Minus size={16} />;
    if (variacion > 0) return <TrendingUp size={16} className="variacion-up" />;
    if (variacion < 0) return <TrendingDown size={16} className="variacion-down" />;
    return <Minus size={16} />;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
  };

  const calcularVariacion = (actual, anterior) => {
    if (!anterior || anterior === 0) return null;
    return ((actual - anterior) / anterior * 100).toFixed(1);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const areaConfig = AREAS[areaActiva];
    const mesData = comparativo?.meses?.find(m => m.mes_formato === label);
    if (!mesData) return null;

    return (
      <div className="historial-tooltip">
        <p className="tooltip-label">{label}</p>
        {areaConfig.campos.map(campo => (
          <p key={campo.key} className="tooltip-item" style={{ color: campo.color }}>
            <span>{campo.label}:</span>
            <span>{formatNumber(mesData[campo.key])}</span>
          </p>
        ))}
        <p className="tooltip-total">
          <span>TOTAL:</span>
          <span>{formatNumber(mesData.total)}</span>
        </p>
      </div>
    );
  };

  const renderTablaComparativa = () => {
    if (!comparativo || !comparativo.meses || comparativo.meses.length === 0) {
      return (
        <div className="empty-state">
          <History size={48} />
          <p>No hay datos historicos para este periodo</p>
        </div>
      );
    }

    const areaConfig = AREAS[areaActiva];
    const meses = comparativo.meses;

    return (
      <div className="tabla-comparativa-container">
        <table className="tabla-comparativa">
          <thead>
            <tr>
              <th className="campo-header">Campo</th>
              {meses.map(mes => (
                <th key={mes.mes_formato} className="mes-header">
                  {mes.mes_formato}
                </th>
              ))}
              <th className="variacion-header">Var.</th>
            </tr>
          </thead>
          <tbody>
            {areaConfig.campos.map(campo => {
              const valores = meses.map(m => m[campo.key] || 0);
              const ultimo = valores[valores.length - 1];
              const penultimo = valores.length > 1 ? valores[valores.length - 2] : null;
              const variacion = calcularVariacion(ultimo, penultimo);

              return (
                <tr key={campo.key}>
                  <td className="campo-label" style={{ borderLeftColor: campo.color }}>
                    {campo.label}
                  </td>
                  {meses.map(mes => (
                    <td key={`${campo.key}-${mes.mes_formato}`} className="valor-cell">
                      {formatNumber(mes[campo.key])}
                    </td>
                  ))}
                  <td className={`variacion-cell ${variacion > 0 ? 'positive' : variacion < 0 ? 'negative' : ''}`}>
                    {variacion !== null ? `${variacion > 0 ? '+' : ''}${variacion}%` : '-'}
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td className="campo-label total">TOTAL</td>
              {meses.map(mes => (
                <td key={`total-${mes.mes_formato}`} className="valor-cell total">
                  {formatNumber(mes.total)}
                </td>
              ))}
              <td className={`variacion-cell ${comparativo.variacion_porcentual > 0 ? 'positive' : comparativo.variacion_porcentual < 0 ? 'negative' : ''}`}>
                {comparativo.variacion_porcentual !== null
                  ? `${comparativo.variacion_porcentual > 0 ? '+' : ''}${comparativo.variacion_porcentual}%`
                  : '-'
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderGrafica = () => {
    if (!comparativo || !comparativo.meses || comparativo.meses.length === 0) {
      return (
        <div className="empty-state">
          <History size={48} />
          <p>No hay datos historicos para este periodo</p>
        </div>
      );
    }

    const areaConfig = AREAS[areaActiva];

    return (
      <div className="grafica-container">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={comparativo.meses} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="mes_formato"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />

            {areaConfig.campos.map(campo => (
              <Line
                key={campo.key}
                type="monotone"
                dataKey={campo.key}
                name={campo.label}
                stroke={campo.color}
                strokeWidth={2}
                dot={{ fill: campo.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="total"
              name="TOTAL"
              stroke="#1f2937"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ fill: '#1f2937', r: 4 }}
            />

            {comparativo.meses.length > 6 && (
              <Brush
                dataKey="mes_formato"
                height={25}
                stroke="#3b82f6"
                fill="#f3f4f6"
                startIndex={Math.max(0, comparativo.meses.length - 6)}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="inventario-historial">
      <div className="historial-header">
        <div className="header-title">
          <History size={20} />
          <h3>Historico {productoNombre || productoId}</h3>
        </div>

        <div className="header-controls">
          {/* Selector de año */}
          <div className="anio-selector">
            <button
              onClick={() => setAnioSeleccionado(a => a - 1)}
              className="anio-btn"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="anio-value">
              <Calendar size={14} />
              {anioSeleccionado}
            </span>
            <button
              onClick={() => setAnioSeleccionado(a => a + 1)}
              className="anio-btn"
              disabled={anioSeleccionado >= new Date().getFullYear()}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Toggle vista */}
          <div className="vista-toggle">
            <button
              className={`toggle-btn ${!vistaGrafica ? 'active' : ''}`}
              onClick={() => setVistaGrafica(false)}
            >
              Tabla
            </button>
            <button
              className={`toggle-btn ${vistaGrafica ? 'active' : ''}`}
              onClick={() => setVistaGrafica(true)}
            >
              Grafica
            </button>
          </div>

          <button
            onClick={cargarDatos}
            className="refresh-btn"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs de área */}
      <div className="area-tabs">
        {Object.entries(AREAS).map(([key, area]) => (
          <button
            key={key}
            className={`area-tab ${areaActiva === key ? 'active' : ''}`}
            onClick={() => setAreaActiva(key)}
          >
            {area.nombre}
          </button>
        ))}
      </div>

      {/* Indicador de variación */}
      {comparativo && comparativo.variacion_porcentual !== null && (
        <div className={`variacion-banner ${comparativo.variacion_porcentual > 0 ? 'positive' : comparativo.variacion_porcentual < 0 ? 'negative' : 'neutral'}`}>
          {getIconoVariacion(comparativo.variacion_porcentual)}
          <span>
            Variacion ultimo mes: {comparativo.variacion_porcentual > 0 ? '+' : ''}{comparativo.variacion_porcentual}%
          </span>
        </div>
      )}

      {/* Contenido principal */}
      <div className="historial-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando datos...</p>
          </div>
        ) : vistaGrafica ? (
          renderGrafica()
        ) : (
          renderTablaComparativa()
        )}
      </div>
    </div>
  );
};

export default InventarioHistorial;
