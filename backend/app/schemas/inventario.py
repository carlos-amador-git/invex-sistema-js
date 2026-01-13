from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InventarioTSYS(BaseModel):
    boveda_trabajo: int
    boveda_principal: int
    trasco_rep: Optional[int] = 0


class InventarioDistribucion(BaseModel):
    dist_colocacion: int
    dist_normal: int
    dist_devoluciones: int
    stock_seguridad_modulos: Optional[int] = None  # Distribución captura esto para Módulos


class InventarioModulos(BaseModel):
    mod_colocacion: int
    mod_normal: int = 0
    mod_stock: int


class InventarioUpdate(BaseModel):
    boveda_trabajo: Optional[int] = None
    boveda_principal: Optional[int] = None
    trasco_rep: Optional[int] = None
    en_proceso_cantidad: Optional[int] = None
    ordenes_activas: Optional[int] = None
    dist_colocacion: Optional[int] = None
    dist_normal: Optional[int] = None
    dist_devoluciones: Optional[int] = None
    mod_colocacion: Optional[int] = None
    mod_normal: Optional[int] = None
    mod_stock: Optional[int] = None


class InventarioResponse(BaseModel):
    id: int
    producto_id: str
    boveda_trabajo: int
    boveda_principal: int
    trasco_rep: int = 0
    en_proceso_cantidad: int
    ordenes_activas: int
    dist_colocacion: int
    dist_normal: int
    dist_devoluciones: int
    mod_colocacion: int
    mod_normal: int = 0
    mod_stock: int
    fecha_compra_sugerida: Optional[str] = None
    fecha_entrega_estimada: Optional[str] = None
    mes_alerta: Optional[str] = None
    presupuesto_pym01: int
    presupuesto_adq7: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
