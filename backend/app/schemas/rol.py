from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class RolResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    area: Optional[str] = None
    color: Optional[str] = None
    modulos: List[str]
    permisos: Dict[str, Any]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
