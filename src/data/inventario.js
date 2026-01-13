// Datos de inventario por producto
export const INVENTARIO_DATA = {
  'J14968C': {
    tsys: { bovedaTrabajo: 15207, bovedaPrincipal: 26400 },
    enProceso: { cantidad: 123000, ordenesActivas: 2 },
    distribucion: { colocacion: 11464, normal: 5283, devoluciones: 0 },
    modulos: { colocacion: 10775, stock: 1500 },
    forecast: [
      { mes: 'Oct-25', colocacion: 11900, trascoRep: 2750, btb: 1029, renovAnticipada: 0, forecast: 15679, disponibleConCompra: 164607, disponibleSinCompra: 41607, atiendeConCompra: true, atiendeSinCompra: true },
      { mes: 'Nov-25', colocacion: 22239, trascoRep: 5500, btb: 2057, renovAnticipada: 5158, forecast: 34954, disponibleConCompra: 148929, disponibleSinCompra: 25929, atiendeConCompra: true, atiendeSinCompra: false },
      { mes: 'Dic-25', colocacion: 22239, trascoRep: 5500, btb: 2057, renovAnticipada: 2935, forecast: 32731, disponibleConCompra: 113975, disponibleSinCompra: -9026, atiendeConCompra: true, atiendeSinCompra: false },
      { mes: 'Ene-26', colocacion: 22239, trascoRep: 5500, btb: 2057, renovAnticipada: 7871, forecast: 37667, disponibleConCompra: 81244, disponibleSinCompra: -41757, atiendeConCompra: true, atiendeSinCompra: false },
      { mes: 'Feb-26', colocacion: 22239, trascoRep: 5500, btb: 2057, renovAnticipada: 9804, forecast: 39600, disponibleConCompra: 43577, disponibleSinCompra: -79424, atiendeConCompra: true, atiendeSinCompra: false },
      { mes: 'Mar-26', colocacion: 22239, trascoRep: 5500, btb: 2057, renovAnticipada: 9127, forecast: 38923, disponibleConCompra: 3977, disponibleSinCompra: -119024, atiendeConCompra: false, atiendeSinCompra: false },
    ],
    compras: { 
      fechaSugerida: '10/11/2025', 
      fechaEntrega: '13/02/2026', 
      mesAlerta: 'Feb-26', 
      presupuesto: { PYM01: 20000, ADQ7: 20000 } 
    }
  },
  'J14969C': {
    tsys: { bovedaTrabajo: 8362, bovedaPrincipal: 12500 },
    enProceso: { cantidad: 35000, ordenesActivas: 1 },
    distribucion: { colocacion: 4424, normal: 10180, devoluciones: 0 },
    modulos: { colocacion: 4424, stock: 500 },
    forecast: [
      { mes: 'Oct-25', colocacion: 0, trascoRep: 1000, btb: 61, renovAnticipada: 0, forecast: 1061, disponibleConCompra: 55862, disponibleSinCompra: 20862, atiendeConCompra: true, atiendeSinCompra: true },
      { mes: 'Nov-25', colocacion: 4424, trascoRep: 2000, btb: 61, renovAnticipada: 11077, forecast: 17562, disponibleConCompra: 54801, disponibleSinCompra: 19801, atiendeConCompra: true, atiendeSinCompra: true },
      { mes: 'Dic-25', colocacion: 4424, trascoRep: 2000, btb: 61, renovAnticipada: 4903, forecast: 11388, disponibleConCompra: 37239, disponibleSinCompra: 2239, atiendeConCompra: true, atiendeSinCompra: false },
    ],
    compras: { 
      fechaSugerida: '15/10/2025', 
      fechaEntrega: '20/01/2026', 
      mesAlerta: 'Feb-26', 
      presupuesto: { PYM01: 25000, ADQ7: 10000 } 
    }
  },
  'J14970C': {
    tsys: { bovedaTrabajo: 12570, bovedaPrincipal: 14880 },
    enProceso: { cantidad: 30000, ordenesActivas: 1 },
    distribucion: { colocacion: 7608, normal: 7112, devoluciones: 0 },
    modulos: { colocacion: 7608, stock: 800 },
    forecast: [
      { mes: 'Oct-25', colocacion: 0, trascoRep: 1100, btb: 70, renovAnticipada: 0, forecast: 1170, disponibleConCompra: 57450, disponibleSinCompra: 27450, atiendeConCompra: true, atiendeSinCompra: true },
      { mes: 'Nov-25', colocacion: 7608, trascoRep: 2200, btb: 140, renovAnticipada: 6538, forecast: 16486, disponibleConCompra: 56280, disponibleSinCompra: 26280, atiendeConCompra: true, atiendeSinCompra: true },
    ],
    compras: { 
      fechaSugerida: '15/10/2025', 
      fechaEntrega: '20/01/2026', 
      mesAlerta: 'Feb-26', 
      presupuesto: { PYM01: 21500, ADQ7: 24000 } 
    }
  }
};

// Historial de capturas
export const HISTORIAL_CAPTURAS = [
  { id: 1, usuarioId: 2, usuario: 'María García', area: 'TSYS', producto: 'J14968C', tipo: 'Inventario Físico', valores: { bovedaTrabajo: 15207, bovedaPrincipal: 26400 }, fecha: '2025-10-13 14:30', estatus: 'Aprobado' },
  { id: 2, usuarioId: 3, usuario: 'Roberto Sánchez', area: 'Distribución', producto: 'J14968C', tipo: 'Colocación Mensual', valores: { colocacion: 11464, normal: 5283 }, fecha: '2025-10-13 10:15', estatus: 'Aprobado' },
  { id: 3, usuarioId: 4, usuario: 'Ana López', area: 'Módulos', producto: 'J14968C', tipo: 'Stock Seguridad', valores: { colocacion: 10775, stock: 1500 }, fecha: '2025-10-12 16:45', estatus: 'Aprobado' },
  { id: 4, usuarioId: 2, usuario: 'María García', area: 'TSYS', producto: 'J14969C', tipo: 'Inventario Físico', valores: { bovedaTrabajo: 8362, bovedaPrincipal: 12500 }, fecha: '2025-10-12 11:20', estatus: 'Aprobado' },
  { id: 5, usuarioId: 3, usuario: 'Roberto Sánchez', area: 'Distribución', producto: 'J14969C', tipo: 'Colocación Mensual', valores: { colocacion: 4424, normal: 10180 }, fecha: '2025-10-11 09:30', estatus: 'Aprobado' },
];

// Órdenes de compra
export const ORDENES_COMPRA = [
  { 
    id: 'OC-250136', 
    producto: 'J14968C', 
    proveedor: 'Thales', 
    cantidad: 40000, 
    presupuesto: 'ADQ7',
    estatus: 'En Producción',
    fechaOrden: '2025-09-15',
    fechaEntrega: '2026-02-13'
  },
  { 
    id: 'OC-250137', 
    producto: 'J14968C', 
    proveedor: 'Thales', 
    cantidad: 83000, 
    presupuesto: 'PYM01',
    estatus: 'En Producción',
    fechaOrden: '2025-08-20',
    fechaEntrega: '2026-01-15'
  },
  { 
    id: 'OC-251392', 
    producto: 'J14901I', 
    proveedor: 'MyCard', 
    cantidad: 10000, 
    presupuesto: 'PYM01',
    estatus: 'Nueva Compra',
    fechaOrden: '2025-10-10',
    fechaEntrega: '2026-01-20'
  },
];

export default INVENTARIO_DATA;
