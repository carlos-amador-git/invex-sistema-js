import React, { useState, useEffect } from 'react';
import {
  Package, Truck, Building2, CreditCard, RefreshCw,
  AlertCircle, TrendingUp, ChevronRight,
  Layers, ArrowUpRight, ArrowDownRight, Calendar,
  Box, CheckCircle, Clock, AlertTriangle, FileText,
  ShoppingCart, Factory, History
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import InventarioHistorial from '../InventarioHistorial';
import './Balance.css';

const Balance = ({ selectedProduct, setSelectedProduct }) => {
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState(null);
  const [allInventarios, setAllInventarios] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadProductInventory(selectedProduct);
    }
  }, [selectedProduct]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [productosData, inventariosData, ordenesData] = await Promise.all([
        productService.getAll(),
        inventoryService.getAll(),
        orderService.getAll().catch(() => [])
      ]);
      setProductos(productosData);
      setAllInventarios(inventariosData);
      setOrdenes(ordenesData);

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

  const loadProductInventory = async (productId) => {
    try {
      const data = await inventoryService.getByProduct(productId);
      setInventario(data);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    }
  };

  const getProductoActual = () => {
    return productos.find(p => p.id === selectedProduct) || {};
  };

  const getInventarioProducto = (prodId) => {
    return allInventarios.find(i => i.producto_id === prodId);
  };

  // Calcular órdenes en proceso por producto
  const calcularOrdenesProceso = (productoId) => {
    const ordenesProducto = ordenes.filter(o => o.producto_id === productoId);

    const enProduccion = ordenesProducto
      .filter(o => o.estatus === 'EN PROCESO')
      .reduce((sum, o) => sum + (o.cantidad || 0), 0);

    const enCompra = ordenesProducto
      .filter(o => o.estatus === 'COMPRA')
      .reduce((sum, o) => sum + (o.cantidad || 0), 0);

    return { enProduccion, enCompra, total: enProduccion + enCompra };
  };

  const getEstadoInventario = (total) => {
    if (total < 10000) return { status: 'critico', label: 'Crítico', icon: AlertTriangle, color: 'danger' };
    if (total < 50000) return { status: 'alerta', label: 'Alerta', icon: Clock, color: 'warning' };
    return { status: 'optimo', label: 'Óptimo', icon: CheckCircle, color: 'success' };
  };

  // Calcular totales según la estructura jerárquica
  const calcularTotales = () => {
    if (!inventario) return {
      // TSYS
      trascoRep: 0,
      inmediatos: 0,
      tsys: 0,
      // Proceso
      enProduccion: 0,
      enCompra: 0,
      proceso: 0,
      // Virgen
      virgen: 0,
      // Distribución
      distNormal: 0,
      distDevolucion: 0,
      distribucion: 0,
      // Módulos
      modNormal: 0,
      modStock: 0,
      modulos: 0,
      // Venta
      venta: 0,
      // Total Cadena
      totalCadena: 0
    };

    // TSYS
    const trascoRep = inventario.trasco_rep || 0;
    const bovedaTrabajo = inventario.boveda_trabajo || 0;
    const bovedaPrincipal = inventario.boveda_principal || 0;
    const inmediatos = bovedaTrabajo + bovedaPrincipal;
    const tsys = trascoRep + inmediatos;

    // Proceso (desde órdenes de compra)
    const ordenesCalc = calcularOrdenesProceso(selectedProduct);
    const enProduccion = ordenesCalc.enProduccion;
    const enCompra = ordenesCalc.enCompra;
    const proceso = enProduccion + enCompra;

    // Inventario Virgen
    const virgen = proceso + tsys;

    // Distribución
    const distNormal = inventario.dist_normal || 0;
    const distDevolucion = inventario.dist_devoluciones || 0;
    const distribucion = distNormal + distDevolucion;

    // Módulos (inventario físico)
    const modNormal = inventario.mod_normal || 0;
    const modStock = inventario.mod_stock || 0;
    const modulos = modNormal + modStock;

    // Colocación mensual (demanda)
    const colocacionDist = inventario.dist_colocacion || 0;
    const colocacionMod = inventario.mod_colocacion || 0;
    const colocacionTotal = colocacionDist + colocacionMod;

    // Inventario Venta (personalizado)
    const venta = distribucion + modulos;

    // Total Cadena
    const totalCadena = virgen + venta;

    return {
      trascoRep,
      bovedaTrabajo,
      bovedaPrincipal,
      inmediatos,
      tsys,
      enProduccion,
      enCompra,
      proceso,
      virgen,
      distNormal,
      distDevolucion,
      distribucion,
      modNormal,
      modStock,
      modulos,
      venta,
      totalCadena,
      colocacionDist,
      colocacionMod,
      colocacionTotal
    };
  };

  const totales = calcularTotales();
  const productoActual = getProductoActual();
  const estado = getEstadoInventario(totales.totalCadena);
  const EstadoIcon = estado.icon;

  // Calcular porcentajes
  const pctVirgen = totales.totalCadena > 0 ? ((totales.virgen / totales.totalCadena) * 100).toFixed(1) : 0;
  const pctVenta = totales.totalCadena > 0 ? ((totales.venta / totales.totalCadena) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="balance-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando balance de inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="balance-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadInitialData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="balance-wrapper">
      {/* Header */}
      <header className="balance-header">
        <div className="header-content">
          <div className="header-icon">
            <Layers size={28} />
          </div>
          <div className="header-text">
            <h1>Balance de Inventario</h1>
            <p>Cadena completa de inventario por producto</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`historial-btn ${mostrarHistorial ? 'active' : ''}`}
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            title="Ver historico"
          >
            <History size={18} />
            <span>Historico</span>
          </button>
          <button className="refresh-btn" onClick={loadInitialData}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Product Selector Grid */}
      <div className="product-selector-section">
        <h3 className="section-title">
          <CreditCard size={18} />
          Selecciona un Producto
        </h3>
        <div className="product-cards-grid">
          {productos.slice(0, 8).map(prod => {
            const inv = getInventarioProducto(prod.id);
            const ordenesCalc = calcularOrdenesProceso(prod.id);
            const tsysTotal = inv ? (inv.boveda_trabajo || 0) + (inv.boveda_principal || 0) + (inv.trasco_rep || 0) : 0;
            const total = tsysTotal + ordenesCalc.total;
            const estadoProd = getEstadoInventario(total);
            const isSelected = selectedProduct === prod.id;

            return (
              <button
                key={prod.id}
                className={`product-selector-card ${isSelected ? 'selected' : ''} ${estadoProd.color}`}
                onClick={() => setSelectedProduct(prod.id)}
              >
                <div className="psc-header">
                  <span className="psc-id">{prod.id}</span>
                  <span className={`psc-status ${estadoProd.color}`}>
                    {React.createElement(estadoProd.icon, { size: 12 })}
                  </span>
                </div>
                <span className="psc-name">{prod.nombre}</span>
                <span className="psc-total">{total.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
        {productos.length > 8 && (
          <div className="product-selector-more">
            <select
              className="product-select-dropdown"
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
            >
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
              ))}
            </select>
            <span className="more-hint">+{productos.length - 8} más productos</span>
          </div>
        )}
      </div>

      {/* Selected Product Info */}
      {inventario && (
        <>
          <div className="selected-product-banner">
            <div className="spb-info">
              <div className="spb-icon">
                <CreditCard size={24} />
              </div>
              <div className="spb-details">
                <span className="spb-id">{selectedProduct}</span>
                <span className="spb-name">{productoActual.nombre}</span>
              </div>
            </div>
            <div className="spb-stats">
              <div className="spb-stat">
                <span className="spb-stat-label">Proveedor</span>
                <span className="spb-stat-value">{productoActual.proveedor || 'N/A'}</span>
              </div>
              <div className="spb-stat">
                <span className="spb-stat-label">Costo Unit.</span>
                <span className="spb-stat-value">${productoActual.costo_unitario?.toFixed(2) || '0.00'}</span>
              </div>
              <div className={`spb-status ${estado.color}`}>
                <EstadoIcon size={16} />
                <span>{estado.label}</span>
              </div>
            </div>
          </div>

          {/* Colocación Banner */}
          <div className="colocacion-banner">
            <div className="cb-icon">
              <TrendingUp size={20} />
            </div>
            <div className="cb-main">
              <span className="cb-label">COLOCACIÓN MENSUAL</span>
              <span className="cb-value">{totales.colocacionTotal.toLocaleString()}</span>
            </div>
            <div className="cb-breakdown">
              <div className="cb-item">
                <span className="cb-item-label">Distribución</span>
                <span className="cb-item-value">{totales.colocacionDist.toLocaleString()}</span>
              </div>
              <div className="cb-item">
                <span className="cb-item-label">Módulos</span>
                <span className="cb-item-value">{totales.colocacionMod.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* TOTAL CADENA - Main Summary */}
          <div className="cadena-total-banner">
            <div className="ctb-main">
              <span className="ctb-label">TOTAL CADENA</span>
              <span className="ctb-value">{totales.totalCadena.toLocaleString()}</span>
            </div>
            <div className="ctb-breakdown">
              <div className="ctb-item virgen">
                <span className="ctb-item-label">Inventario Virgen</span>
                <span className="ctb-item-value">{totales.virgen.toLocaleString()}</span>
                <span className="ctb-item-pct">{pctVirgen}%</span>
              </div>
              <div className="ctb-item venta">
                <span className="ctb-item-label">Inventario Venta</span>
                <span className="ctb-item-value">{totales.venta.toLocaleString()}</span>
                <span className="ctb-item-pct">{pctVenta}%</span>
              </div>
            </div>
          </div>

          {/* INVENTARIO VIRGEN Section */}
          <div className="inventory-section virgen">
            <div className="section-header">
              <h3><Package size={20} /> INVENTARIO VIRGEN</h3>
              <span className="section-total">{totales.virgen.toLocaleString()}</span>
            </div>

            <div className="balance-cards-grid two-cols">
              {/* INVENTARIO PROCESO Card */}
              <div className="balance-card proceso">
                <div className="bc-header">
                  <div className="bc-icon">
                    <Truck size={22} />
                  </div>
                  <div className="bc-title">
                    <h4>Inventario PROCESO</h4>
                    <span>Virgen con el proveedor</span>
                  </div>
                  <div className="bc-total">
                    {totales.proceso.toLocaleString()}
                  </div>
                </div>
                <div className="bc-body">
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <Factory size={14} />
                      <span>En Producción</span>
                    </div>
                    <span className="bc-row-value">{totales.enProduccion.toLocaleString()}</span>
                  </div>
                  <div className="bc-row highlight-row">
                    <div className="bc-row-label">
                      <ShoppingCart size={14} />
                      <span>Compra</span>
                    </div>
                    <span className="bc-row-value">{totales.enCompra.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bc-footer">
                  <div className="bc-bar">
                    <div
                      className="bc-bar-fill produccion"
                      style={{ width: `${totales.proceso > 0 ? (totales.enProduccion / totales.proceso) * 100 : 0}%` }}
                    />
                    <div
                      className="bc-bar-fill compra"
                      style={{ width: `${totales.proceso > 0 ? (totales.enCompra / totales.proceso) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="bc-legend">
                    <span className="legend-item produccion">En Producción</span>
                    <span className="legend-item compra">Compra</span>
                  </div>
                </div>
              </div>

              {/* INVENTARIO TSYS Card */}
              <div className="balance-card tsys">
                <div className="bc-header">
                  <div className="bc-icon">
                    <Package size={22} />
                  </div>
                  <div className="bc-title">
                    <h4>Inventario TSYS</h4>
                    <span>Virgen en almacén</span>
                  </div>
                  <div className="bc-total">
                    {totales.tsys.toLocaleString()}
                  </div>
                </div>
                <div className="bc-body">
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <TrendingUp size={14} />
                      <span>Trasco / Rep</span>
                    </div>
                    <span className="bc-row-value">{totales.trascoRep.toLocaleString()}</span>
                  </div>
                  <div className="bc-row sub-section">
                    <div className="bc-row-label">
                      <Box size={14} />
                      <span><strong>Inmediatos</strong></span>
                    </div>
                    <span className="bc-row-value"><strong>{totales.inmediatos.toLocaleString()}</strong></span>
                  </div>
                  <div className="bc-row indent">
                    <div className="bc-row-label">
                      <span>Bóveda Trabajo</span>
                    </div>
                    <span className="bc-row-value">{totales.bovedaTrabajo.toLocaleString()}</span>
                  </div>
                  <div className="bc-row indent">
                    <div className="bc-row-label">
                      <span>Bóveda Principal</span>
                    </div>
                    <span className="bc-row-value">{totales.bovedaPrincipal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INVENTARIO VENTA Section */}
          <div className="inventory-section venta">
            <div className="section-header">
              <h3><CreditCard size={20} /> INVENTARIO VENTA</h3>
              <span className="section-total">{totales.venta.toLocaleString()}</span>
              <span className="section-subtitle">Personalizado</span>
            </div>

            <div className="balance-cards-grid two-cols">
              {/* Inventario Distribución Card */}
              <div className="balance-card distribucion">
                <div className="bc-header">
                  <div className="bc-icon">
                    <Building2 size={22} />
                  </div>
                  <div className="bc-title">
                    <h4>Inventario Distribución</h4>
                    <span>Sucursales y canales</span>
                  </div>
                  <div className="bc-total">
                    {totales.distribucion.toLocaleString()}
                  </div>
                </div>
                <div className="bc-body">
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <ArrowDownRight size={14} />
                      <span>Normal</span>
                    </div>
                    <span className="bc-row-value">{totales.distNormal.toLocaleString()}</span>
                  </div>
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <ArrowUpRight size={14} />
                      <span>Devolución</span>
                    </div>
                    <span className="bc-row-value">{totales.distDevolucion.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Inventario Módulos Card */}
              <div className="balance-card modulos">
                <div className="bc-header">
                  <div className="bc-icon">
                    <CreditCard size={22} />
                  </div>
                  <div className="bc-title">
                    <h4>Inventario Módulos</h4>
                    <span>Puntos de entrega</span>
                  </div>
                  <div className="bc-total">
                    {totales.modulos.toLocaleString()}
                  </div>
                </div>
                <div className="bc-body">
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <ArrowDownRight size={14} />
                      <span>Normal</span>
                    </div>
                    <span className="bc-row-value">{totales.modNormal.toLocaleString()}</span>
                  </div>
                  <div className="bc-row">
                    <div className="bc-row-label">
                      <Box size={14} />
                      <span>Stock de Seguridad</span>
                    </div>
                    <span className="bc-row-value">{totales.modStock.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Suggestion */}
          {inventario.fecha_compra_sugerida && (
            <div className="purchase-suggestion">
              <div className="ps-icon">
                <Calendar size={24} />
              </div>
              <div className="ps-content">
                <h4>Compra Sugerida</h4>
                <p>Se recomienda realizar orden de compra</p>
              </div>
              <div className="ps-dates">
                <div className="ps-date">
                  <span className="ps-date-label">Fecha Compra</span>
                  <span className="ps-date-value">{inventario.fecha_compra_sugerida}</span>
                </div>
                <ChevronRight size={20} />
                <div className="ps-date">
                  <span className="ps-date-label">Entrega Est.</span>
                  <span className="ps-date-value">{inventario.fecha_entrega_estimada || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Historial Comparativo */}
          {mostrarHistorial && (
            <div className="historial-section">
              <InventarioHistorial
                productoId={selectedProduct}
                productoNombre={productoActual.nombre}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Balance;
