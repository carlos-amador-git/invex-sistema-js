import React, { useState, useEffect } from 'react';
import {
  TrendingUp, AlertTriangle, RefreshCw, AlertCircle,
  Calendar, CreditCard, ChevronRight, CheckCircle,
  XCircle, Clock, ArrowUp, ArrowDown, BarChart3,
  Target, Package, ShoppingCart, Download
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
  ReferenceLine, Brush
} from 'recharts';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import './Forecast.css';

const Forecast = ({ selectedProduct, setSelectedProduct, setActiveModule, setPendingOrden }) => {
  const [productos, setProductos] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [inventario, setInventario] = useState(null);
  const [resumenInv, setResumenInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [vistaConCompras, setVistaConCompras] = useState(true); // Toggle: true = con compras, false = sin compras

  const toast = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadForecast(selectedProduct);
    }
  }, [selectedProduct]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const productosData = await productService.getAll();
      setProductos(productosData);

      if (!selectedProduct && productosData.length > 0) {
        setSelectedProduct(productosData[0].id);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Función para ordenar meses cronológicamente (formato: "Mes-YY")
  const ordenarMeses = (data) => {
    const mesOrden = {
      'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Ago': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dic': 12
    };

    return [...data].sort((a, b) => {
      const [mesA, anioA] = a.mes.split('-');
      const [mesB, anioB] = b.mes.split('-');

      // Primero comparar por año
      const yearA = parseInt(anioA, 10);
      const yearB = parseInt(anioB, 10);
      if (yearA !== yearB) return yearA - yearB;

      // Luego comparar por mes
      return (mesOrden[mesA] || 0) - (mesOrden[mesB] || 0);
    });
  };

  const loadForecast = async (productId) => {
    try {
      const [forecastData, invData, resumenData] = await Promise.all([
        inventoryService.getForecast(productId),
        inventoryService.getByProduct(productId),
        inventoryService.getResumen(productId).catch(() => null)
      ]);
      // Ordenar forecast cronológicamente
      const sortedForecast = ordenarMeses(forecastData);
      setForecast(sortedForecast);
      setInventario(invData);
      setResumenInv(resumenData);
    } catch (err) {
      console.error('Error cargando forecast:', err);
      // Si no hay datos de forecast, usar array vacío
      setForecast([]);
    }
  };

  const handleSyncFromBAU = async () => {
    setSyncing(true);
    try {
      const result = await inventoryService.syncForecast();
      toast.success(`Sincronización completada: ${result.actualizados} actualizados, ${result.creados} creados`);
      // Recargar forecast del producto actual
      if (selectedProduct) {
        await loadForecast(selectedProduct);
      }
    } catch (err) {
      console.error('Error sincronizando forecast:', err);
      toast.error('Error al sincronizar con Procesos BAU');
    } finally {
      setSyncing(false);
    }
  };

  const getProductoActual = () => {
    return productos.find(p => p.id === selectedProduct) || {};
  };

  // Calcular métricas del forecast
  const calcularMetricas = () => {
    if (!forecast || forecast.length === 0) {
      return {
        totalForecast: 0,
        promedioMensual: 0,
        mesAlerta: null,
        mesesCubiertos: 0,
        tendencia: 'estable'
      };
    }

    const totalForecast = forecast.reduce((sum, f) => sum + (f.forecast_total || 0), 0);
    const promedioMensual = Math.round(totalForecast / forecast.length);

    // Encontrar mes de alerta según el toggle (con o sin compras)
    const mesAlerta = vistaConCompras
      ? forecast.find(f => !f.atiende_con_compra)
      : forecast.find(f => !f.atiende_sin_compra);

    // Contar meses cubiertos según el toggle
    const mesesCubiertos = vistaConCompras
      ? forecast.filter(f => f.atiende_con_compra).length
      : forecast.filter(f => f.atiende_sin_compra).length;

    // Calcular tendencia
    const primeraMitad = forecast.slice(0, Math.floor(forecast.length / 2));
    const segundaMitad = forecast.slice(Math.floor(forecast.length / 2));
    const promPrimera = primeraMitad.reduce((sum, f) => sum + (f.forecast_total || 0), 0) / primeraMitad.length;
    const promSegunda = segundaMitad.reduce((sum, f) => sum + (f.forecast_total || 0), 0) / segundaMitad.length;

    let tendencia = 'estable';
    if (promSegunda > promPrimera * 1.1) tendencia = 'creciente';
    if (promSegunda < promPrimera * 0.9) tendencia = 'decreciente';

    return {
      totalForecast,
      promedioMensual,
      mesAlerta,
      mesesCubiertos,
      tendencia
    };
  };

  const metricas = calcularMetricas();
  const productoActual = getProductoActual();

  // Función para crear orden desde el forecast
  const handleCrearOrden = () => {
    // Calcular cantidad sugerida basada en el forecast
    const cantidadSugerida = metricas.promedioMensual * 6; // 6 meses de demanda

    // Pasar datos a Ordenes vía props y cambiar módulo
    toast.info(`Creando orden para ${selectedProduct}...`);
    setPendingOrden({
      crearOrden: true,
      producto_id: selectedProduct,
      cantidad_sugerida: cantidadSugerida,
      proveedor_id: productoActual.proveedor_id
    });
    setActiveModule('ordenes');
  };

  // Custom Tooltip para la gráfica
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Obtener datos completos del mes desde el forecast
      const mesData = forecast.find(f => f.mes === label);

      return (
        <div className="forecast-tooltip">
          <p className="tooltip-label">{label}</p>

          {/* Sección de Oferta (Disponibilidad) */}
          <div className="tooltip-section">
            <span className="tooltip-section-title">Oferta (Disponibilidad)</span>
            {payload.filter(p => p.dataKey !== 'forecast_total').map((entry, index) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toLocaleString()}
              </p>
            ))}
          </div>

          {/* Sección de Demanda (Forecast) */}
          {mesData && (
            <div className="tooltip-section">
              <span className="tooltip-section-title">Demanda (Forecast)</span>
              <p className="tooltip-item">
                <span>Colocación:</span>
                <span>{(mesData.colocacion || 0).toLocaleString()}</span>
              </p>
              <p className="tooltip-item">
                <span>Trasco/Rep:</span>
                <span>{(mesData.trasco_rep || 0).toLocaleString()}</span>
              </p>
              <p className="tooltip-item">
                <span>BTB:</span>
                <span>{(mesData.btb || 0).toLocaleString()}</span>
              </p>
              <p className="tooltip-item">
                <span>Renov. Ant.:</span>
                <span>{(mesData.renov_anticipada || 0).toLocaleString()}</span>
              </p>
              <p className="tooltip-item total" style={{ color: '#f59e0b' }}>
                <span>Forecast Total:</span>
                <span>{(mesData.forecast_total || 0).toLocaleString()}</span>
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="forecast-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando pronóstico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecast-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadInitialData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="forecast-wrapper">
      {/* Header */}
      <header className="forecast-header">
        <div className="header-content">
          <div className="header-icon">
            <TrendingUp size={28} />
          </div>
          <div className="header-text">
            <h1>Pronóstico y Planeación</h1>
            <p>Proyección de demanda e inventario por producto</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="sync-btn"
            onClick={handleSyncFromBAU}
            disabled={syncing}
            title="Sincronizar datos de Procesos BAU"
          >
            <Download size={18} className={syncing ? 'spin' : ''} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button className="refresh-btn" onClick={() => loadForecast(selectedProduct)}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Product Selector */}
      <div className="product-selector-bar">
        <div className="psb-label">
          <CreditCard size={18} />
          <span>Producto:</span>
        </div>
        <select
          className="psb-select"
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
        >
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
          ))}
        </select>
        <div className="psb-info">
          <span className="psb-provider">{productoActual.proveedor || 'N/A'}</span>
        </div>
      </div>

      {/* Toggle Vista Con/Sin Compras */}
      <div className="vista-toggle-container">
        <div className="vista-toggle">
          <button
            className={`toggle-btn ${vistaConCompras ? 'active' : ''}`}
            onClick={() => setVistaConCompras(true)}
          >
            <Package size={16} />
            Con Compras
          </button>
          <button
            className={`toggle-btn ${!vistaConCompras ? 'active' : ''}`}
            onClick={() => setVistaConCompras(false)}
          >
            <Target size={16} />
            Sin Compras
          </button>
        </div>
        {resumenInv && (
          <div className="vista-info">
            <span className="vista-label">Inventario Base:</span>
            <span className="vista-value">
              {vistaConCompras
                ? `${resumenInv.virgen?.toLocaleString()} (Virgen)`
                : `${resumenInv.tsys?.total?.toLocaleString()} (TSYS)`}
            </span>
          </div>
        )}
      </div>

      {/* Resumen de Inventario */}
      {resumenInv && (
        <div className="inventario-resumen">
          <div className="ir-card tsys">
            <div className="ir-title">TSYS</div>
            <div className="ir-value">{resumenInv.tsys?.total?.toLocaleString()}</div>
            <div className="ir-detail">Trasco/Rep: {resumenInv.tsys?.trasco_rep?.toLocaleString()} | Inmediatos: {resumenInv.tsys?.inmediatos?.total?.toLocaleString()}</div>
          </div>
          <div className="ir-card proceso">
            <div className="ir-title">EN PROCESO</div>
            <div className="ir-value">{resumenInv.proceso?.total?.toLocaleString()}</div>
            <div className="ir-detail">Compra: {resumenInv.proceso?.en_compra?.toLocaleString()} | Producción: {resumenInv.proceso?.en_produccion?.toLocaleString()}</div>
          </div>
          <div className="ir-card virgen">
            <div className="ir-title">VIRGEN</div>
            <div className="ir-value">{resumenInv.virgen?.toLocaleString()}</div>
            <div className="ir-detail">TSYS + Proceso</div>
          </div>
          <div className="ir-card cadena">
            <div className="ir-title">CADENA</div>
            <div className="ir-value">{resumenInv.cadena?.toLocaleString()}</div>
            <div className="ir-detail">Virgen + Venta ({resumenInv.venta?.total?.toLocaleString()})</div>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {metricas.mesAlerta && inventario && (
        <div className="forecast-alert">
          <div className="fa-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="fa-content">
            <h4>Alerta de Compra Requerida</h4>
            <p>
              El inventario alcanzará niveles críticos en <strong>{metricas.mesAlerta.mes}</strong>.
              {inventario.fecha_compra_sugerida && (
                <> Iniciar proceso de compra: <strong>{inventario.fecha_compra_sugerida}</strong></>
              )}
            </p>
          </div>
          <button className="fa-action" onClick={handleCrearOrden}>
            <ShoppingCart size={16} />
            Crear Orden
          </button>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="forecast-kpis">
        <div className="fk-card">
          <div className="fk-icon blue">
            <BarChart3 size={22} />
          </div>
          <div className="fk-content">
            <span className="fk-value">{metricas.totalForecast.toLocaleString()}</span>
            <span className="fk-label">Forecast Total (12 meses)</span>
          </div>
        </div>

        <div className="fk-card">
          <div className="fk-icon purple">
            <Target size={22} />
          </div>
          <div className="fk-content">
            <span className="fk-value">{metricas.promedioMensual.toLocaleString()}</span>
            <span className="fk-label">Promedio Mensual</span>
          </div>
        </div>

        <div className="fk-card">
          <div className={`fk-icon ${metricas.mesesCubiertos >= 6 ? 'green' : metricas.mesesCubiertos >= 3 ? 'yellow' : 'red'}`}>
            <Calendar size={22} />
          </div>
          <div className="fk-content">
            <span className="fk-value">{metricas.mesesCubiertos}</span>
            <span className="fk-label">Meses Cubiertos ({vistaConCompras ? 'c/compra' : 's/compra'})</span>
          </div>
        </div>

        <div className="fk-card">
          <div className={`fk-icon ${metricas.tendencia === 'creciente' ? 'red' : metricas.tendencia === 'decreciente' ? 'green' : 'blue'}`}>
            {metricas.tendencia === 'creciente' ? <ArrowUp size={22} /> :
             metricas.tendencia === 'decreciente' ? <ArrowDown size={22} /> :
             <TrendingUp size={22} />}
          </div>
          <div className="fk-content">
            <span className="fk-value capitalize">{metricas.tendencia}</span>
            <span className="fk-label">Tendencia de Demanda</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="forecast-chart-section">
        <div className="fcs-header">
          <h3>
            <TrendingUp size={20} />
            Proyección de Inventario
          </h3>
          <div className="fcs-legend">
            <span className="legend-item">
              <span className="dot blue"></span>
              Con Compra
            </span>
            <span className="legend-item">
              <span className="dot red"></span>
              Sin Compra
            </span>
            <span className="legend-item">
              <span className="dot yellow"></span>
              Forecast
            </span>
          </div>
        </div>
        <div className="fcs-chart">
          {forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={forecast} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorConCompra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSinCompra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="mes"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}k` : v}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="disponible_con_compra"
                  name="Con Compra"
                  stroke="#3b82f6"
                  strokeWidth={vistaConCompras ? 3 : 1}
                  strokeDasharray={vistaConCompras ? "0" : "5 5"}
                  fillOpacity={vistaConCompras ? 1 : 0.3}
                  fill="url(#colorConCompra)"
                />
                <Area
                  type="monotone"
                  dataKey="disponible_sin_compra"
                  name="Sin Compra"
                  stroke="#ef4444"
                  strokeWidth={!vistaConCompras ? 3 : 1}
                  strokeDasharray={!vistaConCompras ? "0" : "5 5"}
                  fillOpacity={!vistaConCompras ? 1 : 0.3}
                  fill="url(#colorSinCompra)"
                />
                <Line
                  type="monotone"
                  dataKey="forecast_total"
                  name="Forecast"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
                {/* Brush para zoom horizontal */}
                <Brush
                  dataKey="mes"
                  height={30}
                  stroke="#3b82f6"
                  fill="#f3f4f6"
                  startIndex={0}
                  endIndex={Math.min(11, forecast.length - 1)}
                  tickFormatter={(v) => v}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <BarChart3 size={48} />
              <p>No hay datos de forecast disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Table */}
      <div className="forecast-table-section">
        <div className="fts-header">
          <h3>
            <Calendar size={20} />
            Detalle de Pronóstico Mensual
          </h3>
        </div>
        <div className="fts-table-container">
          {forecast.length > 0 ? (
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Colocación</th>
                  <th>Trasco/Rep</th>
                  <th>BTB</th>
                  <th>Renov. Ant.</th>
                  <th>Forecast</th>
                  <th className={vistaConCompras ? 'th-active' : ''}>Disp. c/Compra</th>
                  <th className={!vistaConCompras ? 'th-active' : ''}>Disp. s/Compra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((f, i) => {
                  // Determinar si la fila está en alerta según la vista
                  const enAlerta = vistaConCompras ? !f.atiende_con_compra : !f.atiende_sin_compra;
                  return (
                    <tr key={i} className={enAlerta ? 'alert-row' : ''}>
                      <td className="cell-mes">{f.mes}</td>
                      <td className="cell-number">{(f.colocacion || 0).toLocaleString()}</td>
                      <td className="cell-number">{(f.trasco_rep || 0).toLocaleString()}</td>
                      <td className="cell-number">{(f.btb || 0).toLocaleString()}</td>
                      <td className="cell-number">{(f.renov_anticipada || 0).toLocaleString()}</td>
                      <td className="cell-number cell-forecast">{(f.forecast_total || 0).toLocaleString()}</td>
                      <td className={`cell-number ${vistaConCompras ? 'cell-active' : ''} ${(f.disponible_con_compra || 0) > 0 ? 'cell-positive' : 'cell-negative'}`}>
                        {(f.disponible_con_compra || 0).toLocaleString()}
                      </td>
                      <td className={`cell-number ${!vistaConCompras ? 'cell-active' : ''} ${(f.disponible_sin_compra || 0) > 0 ? 'cell-positive' : 'cell-negative'}`}>
                        {(f.disponible_sin_compra || 0).toLocaleString()}
                      </td>
                      <td className="cell-status">
                        {vistaConCompras ? (
                          // Vista con compras: OK si atiende con compra, crítico si no
                          f.atiende_con_compra ? (
                            <span className="status-badge success">
                              <CheckCircle size={14} />
                              OK
                            </span>
                          ) : (
                            <span className="status-badge danger">
                              <XCircle size={14} />
                              Crítico
                            </span>
                          )
                        ) : (
                          // Vista sin compras: OK si atiende sin compra, Requiere Compra si atiende solo con compra, Crítico si no atiende
                          f.atiende_sin_compra ? (
                            <span className="status-badge success">
                              <CheckCircle size={14} />
                              OK
                            </span>
                          ) : f.atiende_con_compra ? (
                            <span className="status-badge warning">
                              <Clock size={14} />
                              Compra
                            </span>
                          ) : (
                            <span className="status-badge danger">
                              <XCircle size={14} />
                              Crítico
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-data">
              <Calendar size={48} />
              <p>No hay datos de forecast disponibles para este producto</p>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Planning */}
      {inventario && (inventario.fecha_compra_sugerida || inventario.presupuesto_pym01 > 0) && (
        <div className="purchase-planning">
          <div className="pp-header">
            <h3>
              <ShoppingCart size={20} />
              Planeación de Compra
            </h3>
          </div>
          <div className="pp-content">
            <div className="pp-timeline">
              <div className="pp-step">
                <div className="pp-step-icon">
                  <Calendar size={18} />
                </div>
                <div className="pp-step-content">
                  <span className="pp-step-label">Fecha Sugerida</span>
                  <span className="pp-step-value">{inventario.fecha_compra_sugerida || 'N/A'}</span>
                </div>
              </div>
              <ChevronRight size={20} className="pp-arrow" />
              <div className="pp-step">
                <div className="pp-step-icon">
                  <Package size={18} />
                </div>
                <div className="pp-step-content">
                  <span className="pp-step-label">Entrega Estimada</span>
                  <span className="pp-step-value">{inventario.fecha_entrega_estimada || 'N/A'}</span>
                </div>
              </div>
              <ChevronRight size={20} className="pp-arrow" />
              <div className="pp-step">
                <div className="pp-step-icon alert">
                  <AlertTriangle size={18} />
                </div>
                <div className="pp-step-content">
                  <span className="pp-step-label">Mes Alerta</span>
                  <span className="pp-step-value">{inventario.mes_alerta || 'N/A'}</span>
                </div>
              </div>
            </div>
            {(inventario.presupuesto_pym01 > 0 || inventario.presupuesto_adq7 > 0) && (
              <div className="pp-budgets">
                <div className="pp-budget">
                  <span className="pp-budget-label">Presupuesto PYM01</span>
                  <span className="pp-budget-value">{(inventario.presupuesto_pym01 || 0).toLocaleString()}</span>
                </div>
                <div className="pp-budget">
                  <span className="pp-budget-label">Presupuesto ADQ7</span>
                  <span className="pp-budget-value">{(inventario.presupuesto_adq7 || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecast;
