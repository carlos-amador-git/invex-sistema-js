// Catálogo de productos de tarjetas
export const PRODUCTOS = [
  { 
    id: 'J14968C', 
    nombre: 'Volaris 0 - TITULAR + DIGITAL', 
    proveedor: 'Thales', 
    tiempoEntrega: 8, 
    costoUnitario: 10.50,
    marca: 'Visa',
    tipo: 'Crédito',
    activo: true
  },
  { 
    id: 'J14969C', 
    nombre: 'Volaris 1 - TITULAR + DIGITAL', 
    proveedor: 'Thales', 
    tiempoEntrega: 8, 
    costoUnitario: 10.50,
    marca: 'Visa',
    tipo: 'Crédito',
    activo: true
  },
  { 
    id: 'J14970C', 
    nombre: 'Volaris 2 - TITULAR + DIGITAL', 
    proveedor: 'Thales', 
    tiempoEntrega: 8, 
    costoUnitario: 10.50,
    marca: 'Visa',
    tipo: 'Crédito',
    activo: true
  },
  { 
    id: 'J14901I', 
    nombre: 'HEJ IKEA - TITULAR + DIGITAL', 
    proveedor: 'MyCard', 
    tiempoEntrega: 6, 
    costoUnitario: 1.43,
    marca: 'Mastercard',
    tipo: 'Crédito',
    activo: true
  },
  { 
    id: 'J14902I', 
    nombre: 'Welcome Kit HEJ IKEA', 
    proveedor: 'MyCard', 
    tiempoEntrega: 6, 
    costoUnitario: 1.43,
    marca: 'Mastercard',
    tipo: 'Kit',
    activo: true
  },
  { 
    id: 'J14903G', 
    nombre: 'VOYAGE GOLD - TITULAR + DIGITAL', 
    proveedor: 'TGS', 
    tiempoEntrega: 7, 
    costoUnitario: 2.17,
    marca: 'Visa',
    tipo: 'Crédito',
    activo: true
  },
];

// Proveedores
export const PROVEEDORES = [
  { id: 1, nombre: 'Thales', tiempoEntrega: 8, contacto: 'ventas@thales.com' },
  { id: 2, nombre: 'MyCard', tiempoEntrega: 6, contacto: 'ventas@mycard.com' },
  { id: 3, nombre: 'TGS', tiempoEntrega: 7, contacto: 'ventas@tgs.com' },
];

export default PRODUCTOS;
