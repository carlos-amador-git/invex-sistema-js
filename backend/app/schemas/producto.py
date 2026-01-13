from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductoBase(BaseModel):
    id: str  # SKU
    nombre: str
    proveedor_id: int
    tiempo_entrega: Optional[int] = 8
    costo_unitario: Optional[float] = None
    marca: Optional[str] = None
    tipo: Optional[str] = None
    activo: bool = True


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    proveedor_id: Optional[int] = None
    tiempo_entrega: Optional[int] = None
    costo_unitario: Optional[float] = None
    marca: Optional[str] = None
    tipo: Optional[str] = None
    activo: Optional[bool] = None


class ProductoResponse(ProductoBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    proveedor_nombre: Optional[str] = None

    class Config:
        from_attributes = True
