import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, AlertTriangle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Package, CreditCard, RefreshCw,
  Eye, ShoppingCart, ArrowRight, AlertCircle, DollarSign,
  Calendar, BarChart3, Activity
} from 'lucide-react';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { orderService } from '../../services/orderService';
import './Dashboard.css';

const DashboardAdmin = ({ setActiveModule, setSelectedProduct }) => {
  const [productos, setProductos] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productosData, inventariosData, ordenesData] = await Promise.all([
        productService.getAll(),
        inventoryService.getAll(),
        orderService.getAll().catch(() => [])
      ]);
      setProductos(productosData);
      setInventarios(inventariosData);
      setOrdenes(ordenesData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas del dashboard
  const calcularMetricas = () => {
    const productosConInventario = productos.map(p => {
      const inv = inventarios.find(i => i.producto_id === p.id);
      const inventarioTotal = inv ? (inv.boveda_trabajo || 0) + (inv.boveda_principal || 0) : 0;

      // Determinar estatus basado en niveles de inventario
      let estatus = 'seguro';
      if (inventarioTotal < 1000) estatus = 'critico';
      else if (inventarioTotal < 5000) estatus = 'alerta';

      return {
        ...p,
        inventario: inv,
        inventarioTotal,
        bovedaTrabajo: inv?.boveda_trabajo || 0,
        bovedaPrincipal: inv?.boveda_principal || 0,
        estatus
      };
    });

    const totalProductos = productosConInventario.length;
    const productosEnAlerta = productosConInventario.filter(p => p.estatus === 'alerta').length;
    const productosCriticos = productosConInventario.filter(p => p.estatus === 'critico').length;
    const productosSeguro = productosConInventario.filter(p => p.estatus === 'seguro').length;

    // Calcular valor total del inventario
    const valorTotal = productosConInventario.reduce((acc, p) => {
      return acc + (p.inventarioTotal * (p.costo_unitario || 0));
    }, 0);

    // Total de unidades en inventario
    const totalUnidades = productosConInventario.reduce((acc, p) => acc + p.inventarioTotal, 0);

    // Órdenes activas
    const ordenesActivas = ordenes.filter(o =>
      o.estatus === 'En Produccion' || o.estatus === 'Nueva Compra'
    ).length;

    return {
      productosConInventario,
      totalProductos,
      productosEnAlerta,
      productosCriticos,
      productosSeguro,
      valorTotal,
      totalUnidades,
      ordenesActivas
    };
  };

  const metricas = calcularMetricas();

  const getEstatusConfig = (estatus) => {
    switch(estatus) {
      case 'critico':
        return { color: 'danger', icon: AlertTriangle, label: 'Crítico' };
      case 'alerta':
        return { color: 'warning', icon: Clock, label: 'Alerta' };
      default:
        return { color: 'success', icon: CheckCircle, label: 'OK' };
    }
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-icon">
            <LayoutDashboard size={32} />
          </div>
          <div className="header-text">
            <h1>Dashboard Ejecutivo</h1>
            <p>Vista general del inventario de tarjetas bancarias</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={loadData}>
          <RefreshCw size={18} />
        </button>
      </header>

      {/* KPIs Grid */}
      <div className="kpis-grid">
        <div className="kpi-card primary">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper primary">
              <Package size={24} />
            </div>
            <div className="kpi-trend up">
              <TrendingUp size={14} />
              <span>+12%</span>
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{metricas.totalUnidades.toLocaleString()}</span>
            <span className="kpi-label">Total Unidades</span>
          </div>
          <div className="kpi-footer">
            <span>{metricas.totalProductos} productos activos</span>
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper success">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{formatCurrency(metricas.valorTotal)}</span>
            <span className="kpi-label">Valor Inventario</span>
          </div>
          <div className="kpi-footer">
            <span>Costo total en bóvedas</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper warning">
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{metricas.productosEnAlerta}</span>
            <span className="kpi-label">En Alerta</span>
          </div>
          <div className="kpi-footer">
            <span>Requieren atención pronto</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-header">
            <div className="kpi-icon-wrapper danger">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{metricas.productosCriticos}</span>
            <span className="kpi-label">Críticos</span>
          </div>
          <div className="kpi-footer">
            <span>Acción inmediata requerida</span>
          </div>
        </div>
      </div>

      {/* Status Overview & Quick Actions */}
      <div className="dashboard-grid">
        {/* Status Overview */}
        <div className="status-overview card">
          <div className="card-header">
            <h3><BarChart3 size={20} /> Resumen de Estado</h3>
          </div>
          <div className="card-body">
            <div className="status-bars">
              <div className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-label">
                    <CheckCircle size={16} className="text-success" />
                    Óptimo
                  </span>
                  <span className="status-count">{metricas.productosSeguro}</span>
                </div>
                <div className="status-bar">
                  <div
                    className="status-bar-fill success"
                    style={{ width: `${(metricas.productosSeguro / metricas.totalProductos) * 100}%` }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-label">
                    <Clock size={16} className="text-warning" />
                    En Alerta
                  </span>
                  <span className="status-count">{metricas.productosEnAlerta}</span>
                </div>
                <div className="status-bar">
                  <div
                    className="status-bar-fill warning"
                    style={{ width: `${(metricas.productosEnAlerta / metricas.totalProductos) * 100}%` }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-label">
                    <AlertTriangle size={16} className="text-danger" />
                    Crítico
                  </span>
                  <span className="status-count">{metricas.productosCriticos}</span>
                </div>
                <div className="status-bar">
                  <div
                    className="status-bar-fill danger"
                    style={{ width: `${(metricas.productosCriticos / metricas.totalProductos) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="status-summary">
              <div className="summary-item">
                <Activity size={18} />
                <span><strong>{metricas.ordenesActivas}</strong> órdenes activas</span>
              </div>
              <div className="summary-item">
                <Calendar size={18} />
                <span>Próxima entrega: <strong>15 Ene 2026</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions card">
          <div className="card-header">
            <h3><Activity size={20} /> Acciones Rápidas</h3>
          </div>
          <div className="card-body">
            <div className="actions-list">
              <button
                className="action-item"
                onClick={() => setActiveModule('balance')}
              >
                <div className="action-icon">
                  <Package size={20} />
                </div>
                <div className="action-info">
                  <span className="action-title">Balance de Inventario</span>
                  <span className="action-desc">Ver detalle completo</span>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                className="action-item"
                onClick={() => setActiveModule('forecast')}
              >
                <div className="action-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="action-info">
                  <span className="action-title">Pronóstico</span>
                  <span className="action-desc">Proyecciones de demanda</span>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                className="action-item"
                onClick={() => setActiveModule('ordenes')}
              >
                <div className="action-icon">
                  <ShoppingCart size={20} />
                </div>
                <div className="action-info">
                  <span className="action-title">Órdenes de Compra</span>
                  <span className="action-desc">{metricas.ordenesActivas} activas</span>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                className="action-item"
                onClick={() => setActiveModule('materiales')}
              >
                <div className="action-icon">
                  <CreditCard size={20} />
                </div>
                <div className="action-info">
                  <span className="action-title">Materiales</span>
                  <span className="action-desc">Control de insumos</span>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table card">
        <div className="card-header">
          <h3><CreditCard size={20} /> Inventario por Producto</h3>
          <button
            className="view-all-btn"
            onClick={() => setActiveModule('balance')}
          >
            Ver todo <ArrowRight size={16} />
          </button>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Estado</th>
                  <th>Bóveda Trabajo</th>
                  <th>Bóveda Principal</th>
                  <th>Total</th>
                  <th>Nivel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {metricas.productosConInventario.slice(0, 10).map(p => {
                  const config = getEstatusConfig(p.estatus);
                  const IconComponent = config.icon;
                  const maxInventario = 50000; // Para la barra de progreso
                  const porcentaje = Math.min((p.inventarioTotal / maxInventario) * 100, 100);

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <span className="product-id">{p.id}</span>
                          <span className="product-name">{p.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${config.color}`}>
                          <IconComponent size={12} />
                          {config.label}
                        </span>
                      </td>
                      <td className="cell-number">{p.bovedaTrabajo.toLocaleString()}</td>
                      <td className="cell-number">{p.bovedaPrincipal.toLocaleString()}</td>
                      <td className="cell-number cell-total">{p.inventarioTotal.toLocaleString()}</td>
                      <td className="cell-progress">
                        <div className="progress-mini">
                          <div
                            className={`progress-mini-fill ${config.color}`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => {
                            setSelectedProduct && setSelectedProduct(p.id);
                            setActiveModule('forecast');
                          }}
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(metricas.productosCriticos > 0 || metricas.productosEnAlerta > 0) && (
        <div className="alerts-section card">
          <div className="card-header">
            <h3><AlertTriangle size={20} /> Alertas Activas</h3>
          </div>
          <div className="card-body">
            <div className="alerts-list">
              {metricas.productosConInventario
                .filter(p => p.estatus === 'critico' || p.estatus === 'alerta')
                .slice(0, 5)
                .map(p => {
                  const config = getEstatusConfig(p.estatus);
                  return (
                    <div key={p.id} className={`alert-item ${config.color}`}>
                      <div className="alert-icon">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="alert-content">
                        <span className="alert-title">{p.nombre}</span>
                        <span className="alert-desc">
                          {p.estatus === 'critico'
                            ? `Stock crítico: ${p.inventarioTotal.toLocaleString()} unidades`
                            : `Stock bajo: ${p.inventarioTotal.toLocaleString()} unidades`
                          }
                        </span>
                      </div>
                      <button
                        className="alert-action"
                        onClick={() => {
                          setSelectedProduct && setSelectedProduct(p.id);
                          setActiveModule('ordenes');
                        }}
                      >
                        Crear Orden
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;
