from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ==================== Material Schemas ====================

class MaterialBase(BaseModel):
    num_parte: str
    descripcion: str
    cantidad_recibida: Optional[int] = 0
    fecha_ultimo_ingreso: Optional[date] = None
    saldo_actual: Optional[int] = 0
    fecha_ultimo_movimiento: Optional[date] = None
    total_almacen_general: Optional[int] = 0
    total_piso_produccion: Optional[int] = 0


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    descripcion: Optional[str] = None
    cantidad_recibida: Optional[int] = None
    fecha_ultimo_ingreso: Optional[date] = None
    saldo_actual: Optional[int] = None
    fecha_ultimo_movimiento: Optional[date] = None
    total_almacen_general: Optional[int] = None
    total_piso_produccion: Optional[int] = None


class MaterialResponse(MaterialBase):
    total_inventario: int
    dias_sin_movimiento: Optional[int] = None
    activo: int
    productos_relacionados: Optional[List[str]] = []

    class Config:
        from_attributes = True


# ==================== Relación Producto-Material ====================

class RelacionProductoMaterialCreate(BaseModel):
    producto_id: str
    material_num_parte: str
    tipo_material: str  # welcome_kit, inserto, bolsa_segurisello, sobre, etiqueta


class RelacionProductoMaterialResponse(BaseModel):
    id: int
    producto_id: str
    material_num_parte: str
    tipo_material: str

    class Config:
        from_attributes = True


# ==================== Movimiento de Material ====================

class MovimientoMaterialCreate(BaseModel):
    material_num_parte: str
    tipo_movimiento: str  # entrada, salida, ajuste
    cantidad: int
    motivo: Optional[str] = None


class MovimientoMaterialResponse(BaseModel):
    id: int
    material_num_parte: str
    tipo_movimiento: str
    cantidad: int
    cantidad_anterior: int
    cantidad_nueva: int
    motivo: Optional[str]
    usuario_id: int
    fecha: datetime

    class Config:
        from_attributes = True


# ==================== Alertas y Reportes ====================

class AlertaMaterial(BaseModel):
    tipo: str  # exceso_plastico, sin_movimiento, bajo_stock
    mensaje: str
    severidad: str  # alta, media, baja
    material_num_parte: Optional[str] = None
    producto_id: Optional[str] = None
    valor_actual: Optional[float] = None
    valor_limite: Optional[float] = None


class ReporteDiferencias(BaseModel):
    producto_id: str
    producto_nombre: str
    total_plasticos: int
    total_materiales: int
    porcentaje_plasticos: float
    excede_limite: bool
    materiales_detalle: List[dict]


class ResumenInventarioMateriales(BaseModel):
    total_materiales: int
    total_items: int
    materiales_sin_movimiento_30_dias: int
    materiales_sin_movimiento_90_dias: int
    alertas_activas: int
