from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============ Presupuesto Schemas ============

class PresupuestoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20)
    descripcion: Optional[str] = None


class PresupuestoCreate(PresupuestoBase):
    pass


class PresupuestoUpdate(BaseModel):
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class PresupuestoResponse(PresupuestoBase):
    id: int
    activo: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Proceso BAU Schemas ============

class ProcesoBAUBase(BaseModel):
    producto_id: str
    tipo_proceso: str = Field(..., pattern="^(trascodificacion|renovacion_anticipada|btb)$")
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020, le=2100)
    cantidad: int = Field(..., ge=0)
    presupuesto_id: Optional[int] = None


class ProcesoBAUCreate(ProcesoBAUBase):
    pass


class ProcesoBAUUpdate(BaseModel):
    cantidad: Optional[int] = Field(None, ge=0)
    presupuesto_id: Optional[int] = None


class ProcesoBAUResponse(ProcesoBAUBase):
    id: int
    usuario_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    producto_nombre: Optional[str] = None
    presupuesto_codigo: Optional[str] = None
    usuario_nombre: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Historial Schemas ============

class ProcesoBAUHistorialResponse(BaseModel):
    id: int
    proceso_id: int
    cantidad_anterior: int
    cantidad_nueva: int
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    fecha: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Excel Import Schemas ============

class ProcesoBAUExcelRow(BaseModel):
    producto_id: str
    mes: int
    anio: int
    trascodificacion: Optional[int] = 0
    btb: Optional[int] = 0
    renovacion_anticipada: Optional[int] = 0
    presupuesto_codigo: Optional[str] = None


class ProcesoBAUBulkCreate(BaseModel):
    registros: List[ProcesoBAUExcelRow]


class ProcesoBAUImportResult(BaseModel):
    creados: int
    actualizados: int
    errores: int
    mensajes: List[str] = []
