from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class CapturaCreate(BaseModel):
    producto_id: str
    area: str  # TSYS, Distribucion, Modulos
    tipo: str  # Inventario Fisico, Colocacion Mensual, etc.
    valores: Dict[str, Any]


class CapturaResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: Optional[str] = None
    producto_id: str
    area: str
    tipo: str
    valores: Dict[str, Any]
    fecha: datetime
    estatus: str
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True
