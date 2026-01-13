import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, RefreshCw, AlertCircle, Search,
  Filter, Package, Truck, CheckCircle, Clock, XCircle,
  Calendar, DollarSign, ChevronRight, X, CreditCard,
  Building2, FileText, Edit2, MoreVertical, Save, Users,
  Phone, Mail, Timer, Layers, Trash2, Upload, Eye,
  ChevronDown, ChevronUp, FileSpreadsheet, History,
  FileDown, Printer, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { orderService } from '../../services/orderService';
import { productService, providerService } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../EmptyState/EmptyState';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './Ordenes.css';

const ESTATUS_CONFIG = {
  'PENDIENTE': { color: 'warning', icon: Clock, label: 'Pendiente', order: 1 },
  'COMPRA': { color: 'info', icon: ShoppingCart, label: 'Compra', order: 2 },
  'EN PROCESO': { color: 'primary', icon: Truck, label: 'En Proceso', order: 3 },
  'COMPLETADA': { color: 'success', icon: CheckCircle, label: 'Completada', order: 4 },
  'PAGADA': { color: 'green', icon: CheckCircle, label: 'Pagada', order: 5 },
  'CANCELADA': { color: 'danger', icon: XCircle, label: 'Cancelada', order: 6 }
};

const Ordenes = ({ pendingOrden, setPendingOrden }) => {
  // Tab activa
  const [activeTab, setActiveTab] = useState('ordenes');

  // Estados de órdenes
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modal de orden
  const [showOrdenModal, setShowOrdenModal] = useState(false);
  const [editingOrden, setEditingOrden] = useState(null);
  const [ordenForm, setOrdenForm] = useState({
    producto_id: '',
    proveedor_id: '',
    cantidad: '',
    presupuesto: 'PYM01',
    fecha_orden: new Date().toISOString().split('T')[0],
    fecha_entrega: '',
    costo_unitario: '',
    descuento: '',
    costo_total: '',
    notas: ''
  });
  const [savingOrden, setSavingOrden] = useState(false);

  // Estados de proveedores
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [proveedorForm, setProveedorForm] = useState({
    nombre: '',
    tiempo_entrega: 8,
    contacto: '',
    email: '',
    telefono: ''
  });
  const [savingProveedor, setSavingProveedor] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');

  // Precios de proveedor
  const [precios, setPrecios] = useState([]);
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [precioForm, setPrecioForm] = useState({
    proveedor_id: '',
    producto_id: '',
    costo_unitario: '',
    moneda: 'MXN'
  });

  // Modal de confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'danger'
  });

  // Estados para Excel Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [autoCreateProducts, setAutoCreateProducts] = useState(false);

  // Estados para ver entregas parciales
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showEntregasModal, setShowEntregasModal] = useState(false);
  const [selectedOrdenEntregas, setSelectedOrdenEntregas] = useState(null);

  // Estados para historial
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [selectedOrdenHistorial, setSelectedOrdenHistorial] = useState(null);
  const [historialData, setHistorialData] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Estados para PDF - Datos predeterminados del formato INVEX
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedOrdenPDF, setSelectedOrdenPDF] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfFormData, setPdfFormData] = useState({
    solicitante: 'Carlos Daniel Oloris Foreros',
    area: 'Banca Transaccional/Operaciones',
    correo: 'cdionisio@invex.com',
    extension: '7764',
    autorizador: 'Yohana Antonio Gomez',
    clave_presupuestal: 'TDC20259T-AD007',
    centro_costos: '90300000',
    usuario_bien: 'Jose Luis Salsamendi Cao',
    area_usuario: 'BT Operaciones',
    razon_social: 'BANCO INVEX SA INSTITUCION DE BANCA MULTIPLE',
    area_uso: 'BT Operaciones',
    motivo_compra: 'Plástico virgen para producción de TDC (Venta Inmediata) en TSYS MX y posterior colocación en módulos y distribución.',
    es_compra_unica: false,
    es_compra_regular: true,
    unidad_medida: 'PZA',
    direccion_entrega: 'TSYS MX, Toluca EDOMEX'
  });

  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  // Efecto para abrir modal si viene del Forecast o Inventario de Materiales
  useEffect(() => {
    if (!pendingOrden || productos.length === 0 || proveedores.length === 0) return;

    // Orden desde Forecast (plásticos)
    if (pendingOrden.crearOrden) {
      const { producto_id, cantidad_sugerida, proveedor_id } = pendingOrden;

      setOrdenForm(prev => ({
        ...prev,
        producto_id: producto_id || '',
        proveedor_id: proveedor_id || '',
        cantidad: cantidad_sugerida ? Math.round(cantidad_sugerida) : '',
        fecha_orden: new Date().toISOString().split('T')[0]
      }));

      setShowOrdenModal(true);

      if (setPendingOrden) {
        setPendingOrden(null);
      }
    }
    // Orden desde Inventario de Materiales
    else if (pendingOrden.tipo === 'material') {
      const { material_id, material_descripcion, cantidad, fecha_orden } = pendingOrden;

      // Pre-llenar con datos del material
      setOrdenForm(prev => ({
        ...prev,
        producto_id: material_id || '',
        proveedor_id: '',
        cantidad: cantidad || '',
        fecha_orden: fecha_orden || new Date().toISOString().split('T')[0],
        presupuesto: 'MAT01', // Presupuesto para materiales
        notas: `Material: ${material_descripcion || material_id}`
      }));

      setShowOrdenModal(true);

      if (setPendingOrden) {
        setPendingOrden(null);
      }
    }
  }, [pendingOrden, productos, proveedores, setPendingOrden]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordenesData, productosData, proveedoresData] = await Promise.all([
        orderService.getAll(),
        productService.getAll(),
        providerService.getAll()
      ]);
      setOrdenes(ordenesData);
      setProductos(productosData);
      setProveedores(proveedoresData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const getProducto = (productoId) => {
    return productos.find(p => p.id === productoId) || {};
  };

  const getProveedor = (proveedorId) => {
    return proveedores.find(p => p.id === proveedorId) || {};
  };

  const getEstatusConfig = (estatus) => {
    return ESTATUS_CONFIG[estatus] || { color: 'default', icon: Clock, label: estatus || 'Pendiente', order: 0 };
  };

  // Filtrar primero por búsqueda
  const ordenesBusqueda = ordenes.filter(orden => {
    if (busqueda === '') return true;
    const term = busqueda.toLowerCase();
    return orden.id?.toLowerCase().includes(term) ||
      orden.producto_id?.toLowerCase().includes(term) ||
      orden.nombre_producto?.toLowerCase().includes(term) ||
      getProducto(orden.producto_id)?.nombre?.toLowerCase().includes(term) ||
      orden.proveedor_nombre?.toLowerCase().includes(term);
  });

  // Luego filtrar por estatus
  const ordenesFiltradas = ordenesBusqueda.filter(orden => {
    return filtroEstatus === 'todos' || orden.estatus === filtroEstatus;
  });

  const proveedoresFiltrados = proveedores.filter(p => {
    if (!busquedaProveedor) return true;
    const term = busquedaProveedor.toLowerCase();
    return p.nombre?.toLowerCase().includes(term) ||
           p.contacto?.toLowerCase().includes(term) ||
           p.email?.toLowerCase().includes(term);
  });

  // Contar por estatus (basado en resultados de búsqueda)
  const contarPorEstatus = (estatus) => {
    return ordenesBusqueda.filter(o => o.estatus === estatus).length;
  };

  // Obtener estatus únicos de las órdenes (dinámico)
  const estatusUnicos = [...new Set(ordenes.map(o => o.estatus).filter(Boolean))]
    .sort((a, b) => {
      const orderA = ESTATUS_CONFIG[a]?.order || 99;
      const orderB = ESTATUS_CONFIG[b]?.order || 99;
      return orderA - orderB;
    });

  const calcularTotales = () => {
    // Órdenes activas = pendientes, compra o en proceso
    const activas = ordenes.filter(o =>
      ['PENDIENTE', 'COMPRA', 'EN PROCESO'].includes(o.estatus)
    );
    const totalUnidades = activas.reduce((sum, o) => sum + (o.cantidad || 0), 0);
    const totalCosto = activas.reduce((sum, o) => sum + (o.costo_total || 0), 0);
    return { activas: activas.length, totalUnidades, totalCosto };
  };

  const totales = calcularTotales();

  // ============ Excel Import Functions ============

  const parseExcelDate = (value) => {
    if (!value) return null;
    // Si es número de Excel (días desde 1900)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    // Si es string en formato DD/MM/YYYY o similar
    if (typeof value === 'string') {
      const parts = value.split(/[\/\-]/);
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const year = y.length === 2 ? `20${y}` : y;
        return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Helper para buscar clave con variaciones de espacios
        const findKey = (row, ...keys) => {
          for (const key of keys) {
            // Buscar exacto
            if (row[key] !== undefined) return row[key];
            // Buscar con espacio al final
            if (row[key + ' '] !== undefined) return row[key + ' '];
            // Buscar sin espacios
            const noSpace = key.replace(/\s+/g, '');
            if (row[noSpace] !== undefined) return row[noSpace];
          }
          // Buscar por coincidencia parcial (para manejar saltos de línea)
          const rowKeys = Object.keys(row);
          for (const key of keys) {
            const found = rowKeys.find(k =>
              k.replace(/[\s\n\r]+/g, ' ').trim().toUpperCase().includes(key.toUpperCase())
            );
            if (found && row[found] !== undefined) return row[found];
          }
          return '';
        };

        // Parsear datos con entregas parciales
        const parsedData = jsonData.map(row => {
          // Mapear columnas principales
          const orden = {
            oc: findKey(row, 'OC', 'oc') || '',
            item: findKey(row, 'ITEM', 'item') || '',
            fecha_oc: parseExcelDate(findKey(row, 'FECHA DE OC', 'FECHA_OC', 'fecha_oc')),
            validacion: findKey(row, 'Validación Compra o Producción', 'Validación\nCompra o\nProducción', 'VALIDACION', 'validacion', 'Compra o Producción') || '',
            requi: findKey(row, 'REQUI', 'requi') || '',
            provision: findKey(row, 'PROVISIÓN', 'PROVISION', 'provision') || '',
            tipo_material: findKey(row, 'TIPO DE MATERIAL', 'TIPO_MATERIAL', 'tipo_material') || '',
            presupuesto: findKey(row, 'PRESUPUESTO', 'presupuesto') || '',
            proveedor: findKey(row, 'PROVEEDOR', 'proveedor') || '',
            caracteristica: findKey(row, 'CARACTERISTICA MATERIAL', 'CARACTERISTICA', 'caracteristica') || '',
            nombre_producto: findKey(row, 'NOMBRE DE PRODUCTO', 'NOMBRE_PRODUCTO', 'nombre_producto') || '',
            volumen_total: parseInt(findKey(row, 'VOLUMEN TOTAL', 'VOLUMEN_TOTAL', 'volumen_total') || 0),
            precio_unitario: parseFloat(findKey(row, 'PRECIO POR UNIDAD', 'PRECIO_UNITARIO', 'precio_unitario') || 0),
            entregas: []
          };

          // Buscar entregas parciales (ENTREGA 1, ENTREGA 2, ... hasta ENTREGA 10)
          for (let i = 1; i <= 10; i++) {
            // Buscar cantidad de entrega con variaciones
            const cantidad = parseInt(
              findKey(row, `ENTREGA ${i}`, `ENTREGA_${i}`, `entrega_${i}`) || 0
            );

            if (cantidad > 0) {
              orden.entregas.push({
                numero: i,
                cantidad: cantidad,
                contra_recibo: findKey(row, `CR ENTREGA ${i}`, `CR_ENTREGA_${i}`) || '',
                factura: findKey(row, `FACTURA ${i}`, `FACTURA_${i}`, `FACTURA  ${i}`) || '',
                fecha_pago: parseExcelDate(findKey(row, `F_PAGO ${i}`, `F_PAGO_${i}`)),
                estatus: findKey(row, `ESTATUS ${i}`, `ESTATUS_${i}`) || '',
                fecha_entrega: parseExcelDate(findKey(row, `F_ENTREGA ${i}`, `F_ENTREGA_${i}`)),
                costo: parseFloat(findKey(row, `COSTO ENTREGA ${i}`, `COSTO_ENTREGA_${i}`) || 0)
              });
            }
          }

          return orden;
        }).filter(o => o.oc); // Solo órdenes con OC

        setImportData(parsedData);
        setImportStats(null);
        setShowImportModal(true);
      } catch (err) {
        console.error('Error parseando Excel:', err);
        toast.error('Error al leer el archivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    event.target.value = '';
  }, [toast]);

  const handleImportBatch = async () => {
    if (importData.length === 0) {
      toast.warning('No hay datos para importar');
      return;
    }

    setImporting(true);
    try {
      const result = await orderService.importBatch(importData, autoCreateProducts);
      setImportStats(result);
      const msg = result.productos_creados > 0
        ? `Importación completada: ${result.ordenes_creadas} órdenes, ${result.productos_creados} productos creados`
        : `Importación completada: ${result.ordenes_creadas} creadas, ${result.ordenes_actualizadas} actualizadas`;
      toast.success(msg);
      loadData();
    } catch (err) {
      console.error('Error importando:', err);
      toast.error(err.response?.data?.detail || 'Error al importar datos');
    } finally {
      setImporting(false);
    }
  };

  // ============ Entregas Functions ============

  const toggleOrderExpand = (ordenId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [ordenId]: !prev[ordenId]
    }));
  };

  const handleViewEntregas = (orden) => {
    setSelectedOrdenEntregas(orden);
    setShowEntregasModal(true);
  };

  const handleViewHistorial = async (orden) => {
    setSelectedOrdenHistorial(orden);
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      const data = await orderService.getHistorial(orden.id);
      setHistorialData(data);
    } catch (err) {
      console.error('Error cargando historial:', err);
      toast.error('Error al cargar el historial');
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ============ PDF Functions ============

  const handleOpenPDFModal = (orden) => {
    setSelectedOrdenPDF(orden);
    setPdfFormData(prev => ({
      ...prev,
      motivo_compra: orden.nombre_producto || '',
      clave_presupuestal: orden.presupuesto || ''
    }));
    setShowPDFModal(true);
  };

  const handleDownloadPDFQuick = async (orden) => {
    setGeneratingPDF(true);
    try {
      const blob = await orderService.downloadPDF(orden.id);
      const filename = `OC_${orden.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      orderService.downloadBlob(blob, filename);
      toast.success('PDF descargado correctamente');
    } catch (err) {
      console.error('Error descargando PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleGeneratePDFCustom = async () => {
    if (!selectedOrdenPDF) return;

    setGeneratingPDF(true);
    try {
      const blob = await orderService.downloadPDFCustom(selectedOrdenPDF.id, pdfFormData);
      const filename = `OC_${selectedOrdenPDF.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      orderService.downloadBlob(blob, filename);
      toast.success('PDF generado y descargado correctamente');
      setShowPDFModal(false);
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDeleteOrden = (orden) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar esta orden?',
      message: `La orden ${orden.id} (${orden.producto_id}) será eliminada permanentemente. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await orderService.delete(orden.id);
          toast.success(`Orden ${orden.id} eliminada correctamente`);
          loadData();
        } catch (err) {
          console.error('Error eliminando orden:', err);
          toast.error(err.response?.data?.detail || 'Error al eliminar la orden');
        }
      }
    });
  };

  const handleCambiarEstatus = async (ordenId, nuevoEstatus) => {
    // Si es cancelación, pedir confirmación primero
    if (nuevoEstatus === 'Cancelada') {
      setConfirmModal({
        isOpen: true,
        title: '¿Cancelar esta orden?',
        message: `La orden ${ordenId} será marcada como cancelada. Esta acción no se puede deshacer fácilmente.`,
        confirmLabel: 'Sí, cancelar orden',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await orderService.updateStatus(ordenId, nuevoEstatus);
            toast.success(`Orden ${ordenId} cancelada correctamente`);
            loadData();
          } catch (err) {
            console.error('Error actualizando estatus:', err);
            toast.error('Error al cancelar la orden');
          }
        }
      });
      return;
    }

    // Para otros cambios de estatus, proceder directamente
    try {
      await orderService.updateStatus(ordenId, nuevoEstatus);
      const mensajes = {
        'En Produccion': `Orden ${ordenId} enviada a producción`,
        'Entregada': `Orden ${ordenId} marcada como entregada`
      };
      toast.success(mensajes[nuevoEstatus] || `Estatus actualizado a "${nuevoEstatus}"`);
      loadData();
    } catch (err) {
      console.error('Error actualizando estatus:', err);
      toast.error('Error al actualizar estatus');
    }
  };

  // Generar ID de orden
  const generateOrdenId = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `OC-${yy}${mm}${dd}-${random}`;
  };

  // Calcular costo total con IVA
  const calcularCostoTotal = (cantidad, costoUnitario, descuento) => {
    const cant = parseFloat(cantidad) || 0;
    const costo = parseFloat(costoUnitario) || 0;
    const desc = parseFloat(descuento) || 0;

    const subtotal = cant * costo;
    const montoDescuento = subtotal * (desc / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const iva = subtotalConDescuento * 0.16;
    const total = subtotalConDescuento + iva;

    return {
      subtotal,
      montoDescuento,
      iva,
      total: Math.round(total * 100) / 100
    };
  };

  // Crear/Editar orden
  const handleOpenOrdenModal = (orden = null) => {
    if (orden) {
      setEditingOrden(orden);
      // Intentar calcular el costo unitario si tenemos cantidad y total
      let costoUnitario = orden.costo_unitario || '';
      if (!costoUnitario && orden.cantidad && orden.costo_total) {
        // Calcular inverso: total / 1.16 / cantidad (aproximado sin descuento)
        costoUnitario = Math.round((orden.costo_total / 1.16 / orden.cantidad) * 100) / 100;
      }
      setOrdenForm({
        producto_id: orden.producto_id || '',
        proveedor_id: orden.proveedor_id || '',
        cantidad: orden.cantidad || '',
        presupuesto: orden.presupuesto || 'PYM01',
        fecha_orden: orden.fecha_orden || new Date().toISOString().split('T')[0],
        fecha_entrega: orden.fecha_entrega || '',
        costo_unitario: costoUnitario,
        descuento: orden.descuento || '',
        costo_total: orden.costo_total || '',
        notas: orden.notas || ''
      });
    } else {
      setEditingOrden(null);
      setOrdenForm({
        producto_id: '',
        proveedor_id: '',
        cantidad: '',
        presupuesto: 'PYM01',
        fecha_orden: new Date().toISOString().split('T')[0],
        fecha_entrega: '',
        costo_unitario: '',
        descuento: '',
        costo_total: '',
        notas: ''
      });
    }
    setShowOrdenModal(true);
  };

  const handleOrdenFormChange = (field, value) => {
    setOrdenForm(prev => {
      const updated = { ...prev, [field]: value };

      // Si se selecciona producto, auto-seleccionar su proveedor
      if (field === 'producto_id' && value) {
        const producto = productos.find(p => p.id === value);
        if (producto?.proveedor_id) {
          updated.proveedor_id = producto.proveedor_id;
        }
      }

      // Recalcular costo total cuando cambian cantidad, costo unitario o descuento
      if (['cantidad', 'costo_unitario', 'descuento'].includes(field)) {
        const { total } = calcularCostoTotal(
          field === 'cantidad' ? value : updated.cantidad,
          field === 'costo_unitario' ? value : updated.costo_unitario,
          field === 'descuento' ? value : updated.descuento
        );
        updated.costo_total = total || '';
      }

      return updated;
    });
  };

  const handleSubmitOrden = async () => {
    if (!ordenForm.producto_id || !ordenForm.cantidad || !ordenForm.proveedor_id) {
      toast.warning('Producto, proveedor y cantidad son requeridos');
      return;
    }

    if (!ordenForm.costo_unitario) {
      toast.warning('El costo unitario es requerido');
      return;
    }

    setSavingOrden(true);
    try {
      const ordenData = {
        producto_id: ordenForm.producto_id,
        proveedor_id: parseInt(ordenForm.proveedor_id),
        cantidad: parseInt(ordenForm.cantidad),
        presupuesto: ordenForm.presupuesto,
        fecha_orden: ordenForm.fecha_orden,
        fecha_entrega: ordenForm.fecha_entrega || null,
        costo_unitario: parseFloat(ordenForm.costo_unitario) || 0,
        descuento: parseFloat(ordenForm.descuento) || 0,
        costo_total: parseFloat(ordenForm.costo_total) || 0
      };

      if (editingOrden) {
        // Actualizar
        await orderService.update(editingOrden.id, ordenData);
        toast.success('Orden actualizada correctamente');
      } else {
        // Crear
        const newId = generateOrdenId();
        await orderService.create({
          id: newId,
          ...ordenData,
          estatus: 'Nueva Compra'
        });
        toast.success(`Orden ${newId} creada correctamente`);
      }
      setShowOrdenModal(false);
      loadData();
    } catch (err) {
      console.error('Error guardando orden:', err);
      toast.error(err.response?.data?.detail || 'Error al guardar la orden');
    } finally {
      setSavingOrden(false);
    }
  };

  // Proveedor CRUD
  const handleOpenProveedorModal = (proveedor = null) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setProveedorForm({
        nombre: proveedor.nombre || '',
        tiempo_entrega: proveedor.tiempo_entrega || 8,
        contacto: proveedor.contacto || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || ''
      });
    } else {
      setEditingProveedor(null);
      setProveedorForm({
        nombre: '',
        tiempo_entrega: 8,
        contacto: '',
        email: '',
        telefono: ''
      });
    }
    setShowProveedorModal(true);
  };

  const handleSubmitProveedor = async () => {
    if (!proveedorForm.nombre) {
      toast.warning('El nombre del proveedor es requerido');
      return;
    }

    setSavingProveedor(true);
    try {
      if (editingProveedor) {
        await providerService.update(editingProveedor.id, proveedorForm);
        toast.success('Proveedor actualizado correctamente');
      } else {
        await providerService.create(proveedorForm);
        toast.success('Proveedor creado correctamente');
      }
      setShowProveedorModal(false);
      loadData();
    } catch (err) {
      console.error('Error guardando proveedor:', err);
      toast.error(err.response?.data?.detail || 'Error al guardar proveedor');
    } finally {
      setSavingProveedor(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  if (loading) {
    return (
      <div className="ordenes-loading">
        <RefreshCw className="spin" size={40} />
        <p>Cargando órdenes de compra...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ordenes-error">
        <AlertCircle size={48} />
        <h3>{error}</h3>
        <button onClick={loadData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="ordenes-wrapper">
      {/* Header */}
      <header className="ordenes-header">
        <div className="header-content">
          <div className="header-icon">
            <ShoppingCart size={28} />
          </div>
          <div className="header-text">
            <h1>Órdenes de Compra</h1>
            <p>Gestión de pedidos y proveedores</p>
          </div>
        </div>
        <div className="header-actions">
          <label className="upload-btn">
            <Upload size={18} />
            Cargar Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button className="refresh-btn" onClick={loadData}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="ordenes-tabs">
        <button
          className={`tab-btn ${activeTab === 'ordenes' ? 'active' : ''}`}
          onClick={() => setActiveTab('ordenes')}
        >
          <ShoppingCart size={18} />
          Órdenes de Compra
        </button>
        <button
          className={`tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`}
          onClick={() => setActiveTab('proveedores')}
        >
          <Building2 size={18} />
          Proveedores
        </button>
      </div>

      {/* Tab: Órdenes */}
      {activeTab === 'ordenes' && (
        <>
          {/* KPIs */}
          <div className="ordenes-kpis">
            <div className="ok-card">
              <div className="ok-icon primary">
                <ShoppingCart size={22} />
              </div>
              <div className="ok-content">
                <span className="ok-value">{totales.activas}</span>
                <span className="ok-label">Órdenes Activas</span>
              </div>
            </div>
            <div className="ok-card">
              <div className="ok-icon purple">
                <Package size={22} />
              </div>
              <div className="ok-content">
                <span className="ok-value">{totales.totalUnidades.toLocaleString()}</span>
                <span className="ok-label">Unidades en Proceso</span>
              </div>
            </div>
            <div className="ok-card">
              <div className="ok-icon green">
                <DollarSign size={22} />
              </div>
              <div className="ok-content">
                <span className="ok-value">{formatCurrency(totales.totalCosto)}</span>
                <span className="ok-label">Costo Total Activo</span>
              </div>
            </div>
            <div className="ok-card">
              <div className="ok-icon yellow">
                <Truck size={22} />
              </div>
              <div className="ok-content">
                <span className="ok-value">{contarPorEstatus('En Produccion')}</span>
                <span className="ok-label">En Producción</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="ordenes-filters">
            <div className="filter-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por ID o producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <button className="new-order-btn" onClick={() => handleOpenOrdenModal()}>
              <Plus size={18} />
              Nueva Orden
            </button>
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filtroEstatus === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroEstatus('todos')}
            >
              Todas ({ordenesBusqueda.length})
            </button>
            {estatusUnicos.map(estatus => {
              const config = ESTATUS_CONFIG[estatus] || { color: 'default', icon: Clock, label: estatus };
              const IconComponent = config.icon;
              const count = contarPorEstatus(estatus);
              // Solo mostrar pestañas con órdenes
              if (count === 0 && filtroEstatus !== estatus) return null;
              return (
                <button
                  key={estatus}
                  className={`filter-tab ${config.color} ${filtroEstatus === estatus ? 'active' : ''}`}
                  onClick={() => setFiltroEstatus(estatus)}
                >
                  <IconComponent size={14} />
                  {config.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Orders Grid */}
          <div className="ordenes-grid">
            {ordenesFiltradas.length === 0 ? (
              <EmptyState
                icon="file"
                title={ordenes.length === 0 ? "No hay órdenes de compra" : "Sin resultados"}
                description={ordenes.length === 0
                  ? "Crea tu primera orden desde el módulo de Pronóstico o haz clic en el botón Nueva Orden."
                  : "No hay órdenes que coincidan con los filtros aplicados. Intenta cambiar los criterios de búsqueda."}
                actionLabel={ordenes.length === 0 ? "Nueva Orden" : null}
                onAction={ordenes.length === 0 ? () => handleOpenOrdenModal() : null}
              />
            ) : (
              ordenesFiltradas.map(orden => {
                const producto = getProducto(orden.producto_id);
                const proveedor = getProveedor(orden.proveedor_id);
                const config = getEstatusConfig(orden.estatus);
                const IconEstatus = config.icon;
                const isExpanded = expandedOrders[orden.id];
                const entregas = orden.entregas || [];
                const cantidadEntregada = orden.cantidad_entregada || 0;
                const cantidadPendiente = orden.cantidad_pendiente || (orden.cantidad - cantidadEntregada);

                return (
                  <div key={orden.id} className={`orden-card ${config.color} ${isExpanded ? 'expanded' : ''}`}>
                    <div className="oc-header">
                      <div className="oc-id">
                        <FileText size={16} />
                        <span>{orden.id}</span>
                      </div>
                      <div className={`oc-status ${config.color}`}>
                        <IconEstatus size={14} />
                        <span>{config.label}</span>
                      </div>
                    </div>

                    <div className="oc-product">
                      <div className="oc-product-icon">
                        <CreditCard size={20} />
                      </div>
                      <div className="oc-product-info">
                        <span className="oc-product-id">{orden.producto_id}</span>
                        <span className="oc-product-name">{orden.nombre_producto || producto.nombre || 'Producto'}</span>
                      </div>
                    </div>

                    <div className="oc-details">
                      <div className="oc-detail">
                        <Building2 size={14} />
                        <span className="oc-detail-label">Proveedor</span>
                        <span className="oc-detail-value">{proveedor.nombre || orden.proveedor_nombre || 'N/A'}</span>
                      </div>
                      <div className="oc-detail">
                        <Package size={14} />
                        <span className="oc-detail-label">Cantidad</span>
                        <span className="oc-detail-value">{(orden.cantidad || 0).toLocaleString()}</span>
                      </div>
                      <div className="oc-detail">
                        <DollarSign size={14} />
                        <span className="oc-detail-label">Costo</span>
                        <span className="oc-detail-value">{formatCurrency(orden.costo_total)}</span>
                      </div>
                      <div className="oc-detail">
                        <FileText size={14} />
                        <span className="oc-detail-label">Presupuesto</span>
                        <span className="oc-detail-value">{orden.presupuesto || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Entregas progress bar */}
                    {orden.cantidad > 0 && (
                      <div className="oc-entregas-progress">
                        <div className="entregas-progress-header">
                          <span>Entregas: {cantidadEntregada.toLocaleString()} / {(orden.cantidad || 0).toLocaleString()}</span>
                          <span className={cantidadPendiente > 0 ? 'pendiente' : 'completado'}>
                            {cantidadPendiente > 0 ? `${cantidadPendiente.toLocaleString()} pendiente` : 'Completo'}
                          </span>
                        </div>
                        <div className="entregas-progress-bar">
                          <div
                            className="entregas-progress-fill"
                            style={{ width: `${Math.min(100, (cantidadEntregada / orden.cantidad) * 100)}%` }}
                          />
                        </div>
                        {entregas.length > 0 && (
                          <button
                            className="entregas-toggle"
                            onClick={() => toggleOrderExpand(orden.id)}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {entregas.length} entrega{entregas.length !== 1 ? 's' : ''} parcial{entregas.length !== 1 ? 'es' : ''}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Entregas expandidas */}
                    {isExpanded && entregas.length > 0 && (
                      <div className="oc-entregas-list">
                        {entregas.map((e, idx) => (
                          <div key={e.id || idx} className={`entrega-item ${e.estatus?.toLowerCase().replace(' ', '-')}`}>
                            <div className="entrega-num">#{e.numero_entrega}</div>
                            <div className="entrega-info">
                              <span className="entrega-cantidad">{(e.cantidad || 0).toLocaleString()} unidades</span>
                              {e.contra_recibo && <span className="entrega-cr">CR: {e.contra_recibo}</span>}
                              {e.factura && <span className="entrega-factura">Fact: {e.factura}</span>}
                            </div>
                            <div className={`entrega-status ${e.estatus?.toLowerCase().replace(' ', '-') || 'pendiente'}`}>
                              {e.estatus || 'PENDIENTE'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="oc-dates">
                      <div className="oc-date">
                        <Calendar size={14} />
                        <span>Orden: {formatDate(orden.fecha_orden)}</span>
                      </div>
                      <ChevronRight size={16} />
                      <div className="oc-date">
                        <Truck size={14} />
                        <span>Entrega: {formatDate(orden.fecha_entrega)}</span>
                      </div>
                    </div>

                    <div className="oc-actions">
                      {orden.estatus === 'PENDIENTE' && (
                        <button
                          className="oc-action-btn info"
                          onClick={() => handleCambiarEstatus(orden.id, 'COMPRA')}
                        >
                          <ShoppingCart size={14} />
                          Validar Compra
                        </button>
                      )}
                      {orden.estatus === 'COMPRA' && (
                        <button
                          className="oc-action-btn primary"
                          onClick={() => handleCambiarEstatus(orden.id, 'EN PROCESO')}
                        >
                          <Truck size={14} />
                          Enviar a Producción
                        </button>
                      )}
                      {orden.estatus === 'EN PROCESO' && (
                        <button
                          className="oc-action-btn success"
                          onClick={() => handleCambiarEstatus(orden.id, 'COMPLETADA')}
                        >
                          <CheckCircle size={14} />
                          Completar
                        </button>
                      )}
                      {(orden.estatus === 'COMPLETADA' || orden.estatus === 'PAGADA') && (
                        <span className="oc-completed">
                          <CheckCircle size={14} />
                          {orden.estatus === 'PAGADA' ? 'Pagada' : 'Completada'}
                        </span>
                      )}
                      {entregas.length > 0 && (
                        <button
                          className="oc-action-btn info"
                          onClick={() => handleViewEntregas(orden)}
                          title="Ver entregas"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        className="oc-action-btn secondary"
                        onClick={() => handleViewHistorial(orden)}
                        title="Ver historial"
                      >
                        <History size={14} />
                      </button>
                      <button
                        className="oc-action-btn pdf"
                        onClick={() => handleOpenPDFModal(orden)}
                        title="Generar PDF"
                        disabled={generatingPDF}
                      >
                        <FileDown size={14} />
                      </button>
                      <button
                        className="oc-action-btn secondary"
                        onClick={() => handleOpenOrdenModal(orden)}
                        title="Editar orden"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="oc-action-btn danger"
                        onClick={() => handleDeleteOrden(orden)}
                        title="Eliminar orden"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Tab: Proveedores */}
      {activeTab === 'proveedores' && (
        <div className="proveedores-section">
          {/* Actions */}
          <div className="proveedores-actions">
            <div className="filter-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={busquedaProveedor}
                onChange={(e) => setBusquedaProveedor(e.target.value)}
              />
            </div>
            <button className="new-order-btn" onClick={() => handleOpenProveedorModal()}>
              <Plus size={18} />
              Nuevo Proveedor
            </button>
          </div>

          {/* Providers Grid */}
          <div className="proveedores-grid">
            {proveedoresFiltrados.length === 0 ? (
              <div className="no-ordenes">
                <Building2 size={48} />
                <p>No hay proveedores registrados</p>
              </div>
            ) : (
              proveedoresFiltrados.map(proveedor => (
                <div key={proveedor.id} className="proveedor-card">
                  <div className="prov-header">
                    <div className="prov-icon">
                      <Building2 size={24} />
                    </div>
                    <div className="prov-info">
                      <h3>{proveedor.nombre}</h3>
                      <span className={`prov-status ${proveedor.activo ? 'active' : 'inactive'}`}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <button
                      className="prov-edit-btn"
                      onClick={() => handleOpenProveedorModal(proveedor)}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div className="prov-details">
                    <div className="prov-detail">
                      <Timer size={16} />
                      <span className="prov-detail-label">Tiempo de entrega</span>
                      <span className="prov-detail-value">{proveedor.tiempo_entrega} semanas</span>
                    </div>
                    {proveedor.contacto && (
                      <div className="prov-detail">
                        <Users size={16} />
                        <span className="prov-detail-label">Contacto</span>
                        <span className="prov-detail-value">{proveedor.contacto}</span>
                      </div>
                    )}
                    {proveedor.email && (
                      <div className="prov-detail">
                        <Mail size={16} />
                        <span className="prov-detail-label">Email</span>
                        <span className="prov-detail-value">{proveedor.email}</span>
                      </div>
                    )}
                    {proveedor.telefono && (
                      <div className="prov-detail">
                        <Phone size={16} />
                        <span className="prov-detail-label">Teléfono</span>
                        <span className="prov-detail-value">{proveedor.telefono}</span>
                      </div>
                    )}
                  </div>

                  <div className="prov-stats">
                    <div className="prov-stat">
                      <span className="prov-stat-value">
                        {ordenes.filter(o => o.proveedor_id === proveedor.id).length}
                      </span>
                      <span className="prov-stat-label">Órdenes</span>
                    </div>
                    <div className="prov-stat">
                      <span className="prov-stat-value">
                        {productos.filter(p => p.proveedor_id === proveedor.id).length}
                      </span>
                      <span className="prov-stat-label">Productos</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar Orden */}
      {showOrdenModal && (
        <div className="modal-overlay" onClick={() => setShowOrdenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingOrden ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingOrden ? `Editar Orden ${editingOrden.id}` : 'Nueva Orden de Compra'}
              </h3>
              <button className="modal-close" onClick={() => setShowOrdenModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Producto *</label>
                <select
                  className="form-select"
                  value={ordenForm.producto_id}
                  onChange={(e) => handleOrdenFormChange('producto_id', e.target.value)}
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Proveedor *</label>
                <select
                  className="form-select"
                  value={ordenForm.proveedor_id}
                  onChange={(e) => handleOrdenFormChange('proveedor_id', e.target.value)}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={ordenForm.cantidad}
                    onChange={(e) => handleOrdenFormChange('cantidad', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Presupuesto</label>
                  <select
                    className="form-select"
                    value={ordenForm.presupuesto}
                    onChange={(e) => handleOrdenFormChange('presupuesto', e.target.value)}
                  >
                    <option value="PYM01">PYM01</option>
                    <option value="ADQ7">ADQ7</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Orden</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ordenForm.fecha_orden}
                    onChange={(e) => handleOrdenFormChange('fecha_orden', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Estimada de Entrega</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ordenForm.fecha_entrega}
                    onChange={(e) => handleOrdenFormChange('fecha_entrega', e.target.value)}
                  />
                </div>
              </div>
              {/* Sección de costos */}
              <div className="cost-section">
                <h4 className="cost-section-title">
                  <DollarSign size={16} />
                  Cálculo de Costos
                </h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Costo Unitario *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="$0.00"
                      value={ordenForm.costo_unitario}
                      onChange={(e) => handleOrdenFormChange('costo_unitario', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descuento (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="form-input"
                      placeholder="0%"
                      value={ordenForm.descuento}
                      onChange={(e) => handleOrdenFormChange('descuento', e.target.value)}
                    />
                  </div>
                </div>

                {/* Resumen de costos */}
                {ordenForm.cantidad && ordenForm.costo_unitario && (
                  <div className="cost-summary">
                    {(() => {
                      const { subtotal, montoDescuento, iva, total } = calcularCostoTotal(
                        ordenForm.cantidad,
                        ordenForm.costo_unitario,
                        ordenForm.descuento
                      );
                      return (
                        <>
                          <div className="cost-row">
                            <span>Subtotal ({parseInt(ordenForm.cantidad).toLocaleString()} × {formatCurrency(ordenForm.costo_unitario)})</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          {montoDescuento > 0 && (
                            <div className="cost-row discount">
                              <span>Descuento ({ordenForm.descuento}%)</span>
                              <span>- {formatCurrency(montoDescuento)}</span>
                            </div>
                          )}
                          <div className="cost-row">
                            <span>IVA (16%)</span>
                            <span>{formatCurrency(iva)}</span>
                          </div>
                          <div className="cost-row total">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Campo de Notas */}
              {ordenForm.notas && (
                <div className="form-group notas-field">
                  <label>Notas / Referencia</label>
                  <textarea
                    className="form-textarea"
                    value={ordenForm.notas}
                    onChange={(e) => handleOrdenFormChange('notas', e.target.value)}
                    rows={2}
                    readOnly={ordenForm.notas.startsWith('Material:')}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowOrdenModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitOrden}
                disabled={savingOrden}
              >
                {savingOrden ? (
                  <RefreshCw size={16} className="spin" />
                ) : editingOrden ? (
                  <Save size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {editingOrden ? 'Guardar Cambios' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar Proveedor */}
      {showProveedorModal && (
        <div className="modal-overlay" onClick={() => setShowProveedorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingProveedor ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button className="modal-close" onClick={() => setShowProveedorModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del proveedor"
                  value={proveedorForm.nombre}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tiempo de Entrega (semanas)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="8"
                  value={proveedorForm.tiempo_entrega}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, tiempo_entrega: parseInt(e.target.value) || 8 })}
                />
              </div>
              <div className="form-group">
                <label>Contacto</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del contacto"
                  value={proveedorForm.contacto}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@ejemplo.com"
                    value={proveedorForm.email}
                    onChange={(e) => setProveedorForm({ ...proveedorForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+52 55 1234 5678"
                    value={proveedorForm.telefono}
                    onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowProveedorModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitProveedor}
                disabled={savingProveedor}
              >
                {savingProveedor ? (
                  <RefreshCw size={16} className="spin" />
                ) : editingProveedor ? (
                  <Save size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel || 'Confirmar'}
        variant={confirmModal.variant}
      />

      {/* Modal: Import Excel */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowImportModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileSpreadsheet size={20} />
                Importar Órdenes desde Excel
              </h3>
              <button className="modal-close" onClick={() => !importing && setShowImportModal(false)} disabled={importing}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {importStats ? (
                <div className="import-results">
                  <h4>Resultado de la importación</h4>
                  <div className="import-stats-grid">
                    <div className="import-stat success">
                      <span className="import-stat-value">{importStats.ordenes_creadas}</span>
                      <span className="import-stat-label">Órdenes Creadas</span>
                    </div>
                    <div className="import-stat info">
                      <span className="import-stat-value">{importStats.ordenes_actualizadas}</span>
                      <span className="import-stat-label">Órdenes Actualizadas</span>
                    </div>
                    <div className="import-stat purple">
                      <span className="import-stat-value">{importStats.entregas_creadas}</span>
                      <span className="import-stat-label">Entregas Creadas</span>
                    </div>
                    {importStats.productos_creados > 0 && (
                      <div className="import-stat yellow">
                        <span className="import-stat-value">{importStats.productos_creados}</span>
                        <span className="import-stat-label">Productos Creados</span>
                      </div>
                    )}
                    <div className="import-stat danger">
                      <span className="import-stat-value">{importStats.errores}</span>
                      <span className="import-stat-label">Errores</span>
                    </div>
                  </div>
                  {importStats.detalles?.length > 0 && (
                    <div className="import-errors">
                      <h5>Detalles:</h5>
                      <ul>
                        {importStats.detalles.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="import-summary">
                    Se encontraron <strong>{importData.length}</strong> órdenes para importar.
                    {importData.reduce((sum, o) => sum + (o.entregas?.length || 0), 0) > 0 && (
                      <span> Con <strong>{importData.reduce((sum, o) => sum + (o.entregas?.length || 0), 0)}</strong> entregas parciales.</span>
                    )}
                  </p>
                  <div className="import-preview">
                    <table className="import-preview-table">
                      <thead>
                        <tr>
                          <th>OC</th>
                          <th>Item</th>
                          <th>Validación</th>
                          <th>Proveedor</th>
                          <th>Presupuesto</th>
                          <th>Volumen</th>
                          <th>Entregas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 10).map((row, idx) => {
                          const validacion = (row.validacion || '').toUpperCase();
                          let estatusPreview = 'PENDIENTE';
                          let estatusClass = 'pendiente';
                          if (validacion.includes('PRODUCCI')) {
                            estatusPreview = 'EN PROCESO';
                            estatusClass = 'proceso';
                          } else if (validacion.includes('COMPRA')) {
                            estatusPreview = 'COMPRA';
                            estatusClass = 'compra';
                          }
                          return (
                            <tr key={idx}>
                              <td>{row.oc}</td>
                              <td>{row.item}</td>
                              <td>
                                <span className={`estatus-preview ${estatusClass}`}>
                                  {row.validacion || '-'}
                                </span>
                              </td>
                              <td>{row.proveedor}</td>
                              <td>{row.presupuesto}</td>
                              <td>{(row.volumen_total || 0).toLocaleString()}</td>
                              <td>{row.entregas?.length || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {importData.length > 10 && (
                      <p className="preview-more">...y {importData.length - 10} órdenes más</p>
                    )}
                  </div>

                  <div className="import-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={autoCreateProducts}
                        onChange={(e) => setAutoCreateProducts(e.target.checked)}
                      />
                      <span>Crear productos automáticamente si no existen</span>
                    </label>
                    <p className="option-hint">
                      Si está activo, los productos que no existan en el catálogo serán creados automáticamente con la información del Excel.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowImportModal(false)} disabled={importing}>
                {importStats ? 'Cerrar' : 'Cancelar'}
              </button>
              {!importStats && (
                <button className="btn-submit" onClick={handleImportBatch} disabled={importing}>
                  {importing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importar {importData.length} órdenes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Entregas Parciales */}
      {showEntregasModal && selectedOrdenEntregas && (
        <div className="modal-overlay" onClick={() => setShowEntregasModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Package size={20} />
                Entregas - Orden {selectedOrdenEntregas.id}
              </h3>
              <button className="modal-close" onClick={() => setShowEntregasModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="entregas-summary">
                <div className="summary-item">
                  <span className="summary-label">Producto:</span>
                  <span className="summary-value">{selectedOrdenEntregas.producto_id} - {selectedOrdenEntregas.nombre_producto}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Cantidad Total:</span>
                  <span className="summary-value">{(selectedOrdenEntregas.cantidad || 0).toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Entregado:</span>
                  <span className="summary-value success">{(selectedOrdenEntregas.cantidad_entregada || 0).toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Pendiente:</span>
                  <span className="summary-value warning">{(selectedOrdenEntregas.cantidad_pendiente || 0).toLocaleString()}</span>
                </div>
              </div>

              <table className="entregas-detail-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cantidad</th>
                    <th>Contra Recibo</th>
                    <th>Factura</th>
                    <th>F. Pago</th>
                    <th>F. Entrega</th>
                    <th>Costo</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrdenEntregas.entregas || []).map((e, idx) => (
                    <tr key={e.id || idx} className={e.estatus?.toLowerCase().replace(' ', '-')}>
                      <td>{e.numero_entrega}</td>
                      <td>{(e.cantidad || 0).toLocaleString()}</td>
                      <td>{e.contra_recibo || '-'}</td>
                      <td>{e.factura || '-'}</td>
                      <td>{formatDate(e.fecha_pago)}</td>
                      <td>{formatDate(e.fecha_entrega)}</td>
                      <td>{e.costo ? formatCurrency(e.costo) : '-'}</td>
                      <td>
                        <span className={`estatus-badge ${e.estatus?.toLowerCase().replace(' ', '-') || 'pendiente'}`}>
                          {e.estatus || 'PENDIENTE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEntregasModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial de Cambios */}
      {showHistorialModal && selectedOrdenHistorial && (
        <div className="modal-overlay" onClick={() => setShowHistorialModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <History size={20} />
                Historial - Orden {selectedOrdenHistorial.id}
              </h3>
              <button className="modal-close" onClick={() => setShowHistorialModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingHistorial ? (
                <div className="loading-historial">
                  <RefreshCw size={24} className="spin" />
                  <p>Cargando historial...</p>
                </div>
              ) : historialData.length === 0 ? (
                <div className="empty-historial">
                  <History size={48} />
                  <p>No hay registros de cambios para esta orden</p>
                </div>
              ) : (
                <table className="historial-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Acción</th>
                      <th>Campo</th>
                      <th>Anterior</th>
                      <th>Nuevo</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialData.map((h, idx) => (
                      <tr key={h.id || idx} className={h.accion.toLowerCase()}>
                        <td>{new Date(h.fecha).toLocaleString('es-MX')}</td>
                        <td>
                          <span className={`accion-badge ${h.accion.toLowerCase().replace('_', '-')}`}>
                            {h.accion === 'CREATE' ? 'Creación' :
                             h.accion === 'UPDATE' ? 'Actualización' :
                             h.accion === 'DELETE' ? 'Eliminación' :
                             h.accion === 'STATUS_CHANGE' ? 'Cambio Estatus' : h.accion}
                          </span>
                        </td>
                        <td>{h.campo}</td>
                        <td className="valor-anterior">{h.valor_anterior || '-'}</td>
                        <td className="valor-nuevo">{h.valor_nuevo || '-'}</td>
                        <td>{h.usuario_nombre || 'Sistema'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHistorialModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generar PDF de Orden de Compra */}
      {showPDFModal && selectedOrdenPDF && (
        <div className="modal-overlay" onClick={() => !generatingPDF && setShowPDFModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileDown size={20} />
                Generar PDF - Orden {selectedOrdenPDF.id}
              </h3>
              <button className="modal-close" onClick={() => !generatingPDF && setShowPDFModal(false)} disabled={generatingPDF}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body pdf-form">
              <div className="pdf-info-banner">
                <FileText size={18} />
                <div>
                  <strong>Producto:</strong> {selectedOrdenPDF.nombre_producto || selectedOrdenPDF.producto_id}
                  <br />
                  <strong>Cantidad:</strong> {(selectedOrdenPDF.cantidad || 0).toLocaleString()} |
                  <strong> Total:</strong> {formatCurrency(selectedOrdenPDF.costo_total)}
                </div>
              </div>

              <div className="pdf-section">
                <h4>Datos del Solicitante</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Solicitante *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre completo"
                      value={pdfFormData.solicitante}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, solicitante: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Área</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Área del solicitante"
                      value={pdfFormData.area}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, area: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Correo</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="correo@invex.com"
                      value={pdfFormData.correo}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, correo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Extensión</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="1234"
                      value={pdfFormData.extension}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, extension: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Autorizador</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre del autorizador"
                    value={pdfFormData.autorizador}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, autorizador: e.target.value })}
                  />
                </div>
              </div>

              <div className="pdf-section">
                <h4>Datos Presupuestales</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Clave Presupuestal</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="TDC20259T-AD007"
                      value={pdfFormData.clave_presupuestal}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, clave_presupuestal: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Centro de Costos</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="90300000"
                      value={pdfFormData.centro_costos}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, centro_costos: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Usuario del Bien</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre del usuario"
                      value={pdfFormData.usuario_bien}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, usuario_bien: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Área Usuario</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="BT Operaciones"
                      value={pdfFormData.area_usuario}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, area_usuario: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pdf-section">
                <h4>Motivo y Entrega</h4>
                <div className="form-group">
                  <label>Motivo de Compra</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Descripción del motivo de compra..."
                    rows={3}
                    value={pdfFormData.motivo_compra}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, motivo_compra: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Compra</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="tipoCompra"
                          checked={pdfFormData.es_compra_regular}
                          onChange={() => setPdfFormData({ ...pdfFormData, es_compra_regular: true, es_compra_unica: false })}
                        />
                        Compra Regular
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="tipoCompra"
                          checked={pdfFormData.es_compra_unica}
                          onChange={() => setPdfFormData({ ...pdfFormData, es_compra_unica: true, es_compra_regular: false })}
                        />
                        Compra Única
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Unidad de Medida</label>
                    <select
                      className="form-select"
                      value={pdfFormData.unidad_medida}
                      onChange={(e) => setPdfFormData({ ...pdfFormData, unidad_medida: e.target.value })}
                    >
                      <option value="PZA">PZA - Pieza</option>
                      <option value="KIT">KIT - Kit</option>
                      <option value="ROLLO">ROLLO - Rollo</option>
                      <option value="MILLAR">MILLAR - Millar</option>
                      <option value="SERVICIO">SERVICIO - Servicio</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Dirección de Entrega</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Dirección completa de entrega..."
                    rows={2}
                    value={pdfFormData.direccion_entrega}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, direccion_entrega: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer pdf-modal-footer">
              <button className="btn-cancel" onClick={() => setShowPDFModal(false)} disabled={generatingPDF}>
                Cancelar
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleDownloadPDFQuick(selectedOrdenPDF)}
                disabled={generatingPDF}
                title="Descargar PDF con datos básicos"
              >
                {generatingPDF ? <RefreshCw size={16} className="spin" /> : <Printer size={16} />}
                PDF Rápido
              </button>
              <button
                className="btn-submit"
                onClick={handleGeneratePDFCustom}
                disabled={generatingPDF || !pdfFormData.solicitante}
              >
                {generatingPDF ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Generar PDF Completo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ordenes;
