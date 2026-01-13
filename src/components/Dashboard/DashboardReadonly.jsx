import React from 'react';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { PRODUCTOS } from '../../data/productos';
import { INVENTARIO_DATA } from '../../data/inventario';
import './Dashboard.css';

const DashboardReadonly = () => {
  const productosResumen = PRODUCTOS.filter(p => INVENTARIO_DATA[p.id]).map(p => {
    const inv = INVENTARIO_DATA[p.id];
    const inventarioTotal = inv.tsys.bovedaTrabajo + inv.tsys.bovedaPrincipal + inv.enProceso.cantidad;
    const inventarioFisico = inv.tsys.bovedaTrabajo + inv.tsys.bovedaPrincipal;
    
    return {
      ...p,
      inventarioTotal,
      inventarioFisico,
      forecast: inv.forecast[0]?.forecast || 0,
      fechaVencimiento: inv.compras.mesAlerta,
      estatus: inventarioFisico > 30000 ? 'seguro' : 'alerta'
    };
  });

  return (
    <div className="dashboard-module">
      {/* Header con badge readonly */}
      <div className="dashboard-header">
        <span className="readonly-badge">
          <Eye size={14} />
          Solo Lectura
        </span>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card warning">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-label">Productos en Alerta</div>
          <div className="kpi-value">2</div>
          <div className="kpi-sub">Próximos a ordenar</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon">🚨</div>
          <div className="kpi-label">Productos Críticos</div>
          <div className="kpi-value">0</div>
          <div className="kpi-sub">Requieren acción</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📅</div>
          <div className="kpi-label">Próxima Compra</div>
          <div className="kpi-value">10/11/25</div>
          <div className="kpi-sub">Volaris 0 - Thales</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Productos</div>
          <div className="kpi-value">{PRODUCTOS.length}</div>
          <div className="kpi-sub">Monitoreados</div>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="table-card">
        <div className="table-header">
          <h3>Estatus General de Inventario</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Estatus</th>
              <th>Inventario Total</th>
              <th>Forecast</th>
              <th>Fecha Límite</th>
              <th>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {productosResumen.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="product-cell">
                    <span className="product-id">{p.id}</span>
                    <span className="product-name">{p.nombre}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${p.estatus}`}>
                    {p.estatus === 'seguro' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {p.estatus.charAt(0).toUpperCase() + p.estatus.slice(1)}
                  </span>
                </td>
                <td className="cell-number">{p.inventarioTotal.toLocaleString()}</td>
                <td className="cell-number">{p.forecast.toLocaleString()}</td>
                <td>{p.fechaVencimiento}</td>
                <td>{p.proveedor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardReadonly;
