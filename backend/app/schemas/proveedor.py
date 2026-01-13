from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class ProveedorBase(BaseModel):
    nombre: str
    tiempo_entrega: int = 8
    contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool = True


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    tiempo_entrega: Optional[int] = None
    contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None


class ProveedorResponse(ProveedorBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Precio Proveedor Schemas ====================

class PrecioProveedorBase(BaseModel):
    proveedor_id: int
    producto_id: str
    costo_unitario: float
    moneda: str = "MXN"
    vigente_desde: Optional[date] = None
    activo: bool = True


class PrecioProveedorCreate(PrecioProveedorBase):
    pass


class PrecioProveedorUpdate(BaseModel):
    costo_unitario: Optional[float] = None
    moneda: Optional[str] = None
    vigente_desde: Optional[date] = None
    activo: Optional[bool] = None


class PrecioProveedorResponse(PrecioProveedorBase):
    id: int
    producto_nombre: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProveedorConPreciosResponse(ProveedorResponse):
    """Proveedor con lista de precios por producto"""
    precios: List[PrecioProveedorResponse] = []
