from pydantic import BaseModel, field_validator
from typing import Optional, List, Literal
from datetime import datetime


class InventarioHistorialBase(BaseModel):
    """Base schema con campos comunes"""
    producto_id: str
    mes: int
    anio: int
    area: Literal['tsys', 'distribucion', 'modulos']

    @field_validator('mes')
    @classmethod
    def validar_mes(cls, v):
        if not 1 <= v <= 12:
            raise ValueError('El mes debe estar entre 1 y 12')
        return v

    @field_validator('anio')
    @classmethod
    def validar_anio(cls, v):
        if not 2020 <= v <= 2100:
            raise ValueError('El año debe estar entre 2020 y 2100')
        return v


class InventarioHistorialTSYS(BaseModel):
    """Schema para captura de área TSYS"""
    mes: int
    anio: int
    boveda_trabajo: int = 0
    boveda_principal: int = 0
    trasco_rep: int = 0


class InventarioHistorialDistribucion(BaseModel):
    """Schema para captura de área Distribución"""
    mes: int
    anio: int
    dist_colocacion: int = 0
    dist_normal: int = 0
    dist_devoluciones: int = 0


class InventarioHistorialModulos(BaseModel):
    """Schema para captura de área Módulos"""
    mes: int
    anio: int
    mod_colocacion: int = 0
    mod_normal: int = 0
    mod_stock: int = 0


class InventarioHistorialCreate(InventarioHistorialBase):
    """Schema para crear registro historial"""
    # Campos TSYS
    boveda_trabajo: Optional[int] = 0
    boveda_principal: Optional[int] = 0
    trasco_rep: Optional[int] = 0
    # Campos Distribución
    dist_colocacion: Optional[int] = 0
    dist_normal: Optional[int] = 0
    dist_devoluciones: Optional[int] = 0
    # Campos Módulos
    mod_colocacion: Optional[int] = 0
    mod_normal: Optional[int] = 0
    mod_stock: Optional[int] = 0


class InventarioHistorialUpdate(BaseModel):
    """Schema para actualizar registro historial"""
    # Campos TSYS
    boveda_trabajo: Optional[int] = None
    boveda_principal: Optional[int] = None
    trasco_rep: Optional[int] = None
    # Campos Distribución
    dist_colocacion: Optional[int] = None
    dist_normal: Optional[int] = None
    dist_devoluciones: Optional[int] = None
    # Campos Módulos
    mod_colocacion: Optional[int] = None
    mod_normal: Optional[int] = None
    mod_stock: Optional[int] = None


class InventarioHistorialResponse(BaseModel):
    """Schema de respuesta para registro historial"""
    id: int
    producto_id: str
    mes: int
    anio: int
    area: str
    mes_formato: Optional[str] = None
    # Campos TSYS
    boveda_trabajo: int = 0
    boveda_principal: int = 0
    trasco_rep: int = 0
    # Campos Distribución
    dist_colocacion: int = 0
    dist_normal: int = 0
    dist_devoluciones: int = 0
    # Campos Módulos
    mod_colocacion: int = 0
    mod_normal: int = 0
    mod_stock: int = 0
    # Total calculado
    total: Optional[int] = 0
    # Auditoría
    usuario_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventarioHistorialAuditoriaResponse(BaseModel):
    """Schema de respuesta para auditoría"""
    id: int
    historial_id: int
    campo: str
    valor_anterior: Optional[int] = None
    valor_nuevo: Optional[int] = None
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComparativoMes(BaseModel):
    """Datos de un mes para comparativo"""
    mes: int
    anio: int
    mes_formato: str
    boveda_trabajo: int = 0
    boveda_principal: int = 0
    trasco_rep: int = 0
    dist_colocacion: int = 0
    dist_normal: int = 0
    dist_devoluciones: int = 0
    mod_colocacion: int = 0
    mod_normal: int = 0
    mod_stock: int = 0
    total: int = 0


class InventarioComparativoResponse(BaseModel):
    """Schema de respuesta para datos comparativos (gráficas/tablas)"""
    producto_id: str
    area: str
    meses: List[ComparativoMes]
    variacion_porcentual: Optional[float] = None  # Variación último mes vs penúltimo


class ResumenHistorialResponse(BaseModel):
    """Resumen de historial por producto"""
    producto_id: str
    ultimo_registro: Optional[datetime] = None
    meses_registrados: int = 0
    areas_con_datos: List[str] = []
