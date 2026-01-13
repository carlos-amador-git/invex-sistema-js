from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from ..database import get_db
from ..models import Rol, Usuario
from ..schemas.rol import RolResponse
from ..utils.dependencies import get_current_active_user

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=List[RolResponse])
async def list_roles(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar configuración de roles"""
    roles = db.query(Rol).all()
    result = []
    for r in roles:
        result.append({
            "id": r.id,
            "nombre": r.nombre,
            "descripcion": r.descripcion,
            "area": r.area,
            "color": r.color,
            "modulos": json.loads(r.modulos),
            "permisos": json.loads(r.permisos),
            "created_at": r.created_at
        })
    return result


@router.get("/{rol_nombre}", response_model=RolResponse)
async def get_rol(
    rol_nombre: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener rol por nombre"""
    rol = db.query(Rol).filter(Rol.nombre == rol_nombre).first()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    return {
        "id": rol.id,
        "nombre": rol.nombre,
        "descripcion": rol.descripcion,
        "area": rol.area,
        "color": rol.color,
        "modulos": json.loads(rol.modulos),
        "permisos": json.loads(rol.permisos),
        "created_at": rol.created_at
    }
