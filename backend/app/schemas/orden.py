from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ============ Entrega Parcial Schemas ============

class EntregaParcialBase(BaseModel):
    numero_entrega: int
    cantidad: int
    contra_recibo: Optional[str] = None
    factura: Optional[str] = None
    fecha_pago: Optional[date] = None
    estatus: Optional[str] = None
    fecha_entrega: Optional[date] = None
    costo: Optional[float] = None
    notas: Optional[str] = None


class EntregaParcialCreate(EntregaParcialBase):
    orden_id: str


class EntregaParcialUpdate(BaseModel):
    cantidad: Optional[int] = None
    contra_recibo: Optional[str] = None
    factura: Optional[str] = None
    fecha_pago: Optional[date] = None
    estatus: Optional[str] = None
    fecha_entrega: Optional[date] = None
    costo: Optional[float] = None
    notas: Optional[str] = None


class EntregaParcialResponse(EntregaParcialBase):
    id: int
    orden_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Orden Compra Schemas ============

class OrdenBase(BaseModel):
    id: str  # OC número (250136)
    producto_id: str
    proveedor_id: int
    cantidad: int

    # Datos de requisición
    requi: Optional[str] = None
    provision: Optional[str] = None
    validacion: Optional[str] = None

    # Clasificación
    tipo_material: Optional[str] = None
    presupuesto: Optional[str] = None
    caracteristica: Optional[str] = None
    nombre_producto: Optional[str] = None

    # Costos
    costo_unitario: Optional[float] = None
    descuento: Optional[float] = None
    costo_total: Optional[float] = None

    # Fechas
    fecha_orden: Optional[date] = None
    fecha_entrega: Optional[date] = None


class OrdenCreate(OrdenBase):
    estatus: str = "PENDIENTE"


class OrdenUpdate(BaseModel):
    producto_id: Optional[str] = None
    proveedor_id: Optional[int] = None
    cantidad: Optional[int] = None
    requi: Optional[str] = None
    provision: Optional[str] = None
    validacion: Optional[str] = None
    tipo_material: Optional[str] = None
    presupuesto: Optional[str] = None
    caracteristica: Optional[str] = None
    nombre_producto: Optional[str] = None
    costo_unitario: Optional[float] = None
    descuento: Optional[float] = None
    costo_total: Optional[float] = None
    estatus: Optional[str] = None
    fecha_orden: Optional[date] = None
    fecha_entrega: Optional[date] = None


class OrdenResponse(OrdenBase):
    estatus: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    producto_nombre: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    entregas: Optional[List[EntregaParcialResponse]] = []
    cantidad_entregada: Optional[int] = 0
    cantidad_pendiente: Optional[int] = 0

    class Config:
        from_attributes = True


# ============ Import from Excel ============

class OrdenExcelRow(BaseModel):
    """Schema para importar órdenes desde Excel"""
    item: str  # ITEM / producto_id
    fecha_oc: Optional[date] = None
    validacion: Optional[str] = None
    oc: Optional[str] = None
    requi: Optional[str] = None
    provision: Optional[str] = None
    tipo_material: Optional[str] = None
    presupuesto: Optional[str] = None
    proveedor: Optional[str] = None
    caracteristica: Optional[str] = None
    nombre_producto: Optional[str] = None
    volumen_total: Optional[int] = None
    precio_unitario: Optional[float] = None
    # Entregas (hasta 10)
    entregas: Optional[List[dict]] = []


class OrdenImportResult(BaseModel):
    ordenes_creadas: int
    ordenes_actualizadas: int
    entregas_creadas: int
    productos_creados: int = 0
    errores: int
    detalles: List[str] = []


# ============ Historial de Auditoría ============

class HistorialResponse(BaseModel):
    id: int
    orden_id: str
    campo: str
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    accion: str  # CREATE, UPDATE, DELETE, STATUS_CHANGE
    fecha: datetime

    class Config:
        from_attributes = True
