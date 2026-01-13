from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Proveedor, PrecioProveedor, Usuario, Producto
from ..schemas.proveedor import (
    ProveedorCreate, ProveedorUpdate, ProveedorResponse,
    PrecioProveedorCreate, PrecioProveedorUpdate, PrecioProveedorResponse
)
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])


@router.get("/", response_model=List[ProveedorResponse])
async def list_proveedores(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todos los proveedores"""
    return db.query(Proveedor).all()


@router.get("/{proveedor_id}", response_model=ProveedorResponse)
async def get_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener proveedor por ID"""
    proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado"
        )
    return proveedor


@router.post("/", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
async def create_proveedor(
    proveedor: ProveedorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear nuevo proveedor (solo admin)"""
    new_proveedor = Proveedor(**proveedor.model_dump())
    db.add(new_proveedor)
    db.commit()
    db.refresh(new_proveedor)
    return new_proveedor


@router.put("/{proveedor_id}", response_model=ProveedorResponse)
async def update_proveedor(
    proveedor_id: int,
    proveedor_data: ProveedorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar proveedor (solo admin)"""
    proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado"
        )

    update_data = proveedor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proveedor, field, value)

    db.commit()
    db.refresh(proveedor)
    return proveedor


# ==================== Precios de Proveedor ====================

@router.get("/precios/todos", response_model=List[PrecioProveedorResponse])
async def list_all_precios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todos los precios de proveedores"""
    precios = db.query(PrecioProveedor).filter(PrecioProveedor.activo == True).all()
    result = []
    for p in precios:
        producto = db.query(Producto).filter(Producto.id == p.producto_id).first()
        proveedor = db.query(Proveedor).filter(Proveedor.id == p.proveedor_id).first()
        result.append({
            **p.__dict__,
            "producto_nombre": producto.nombre if producto else None,
            "proveedor_nombre": proveedor.nombre if proveedor else None
        })
    return result


@router.get("/{proveedor_id}/precios", response_model=List[PrecioProveedorResponse])
async def get_precios_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener precios de un proveedor específico"""
    precios = db.query(PrecioProveedor).filter(
        PrecioProveedor.proveedor_id == proveedor_id,
        PrecioProveedor.activo == True
    ).all()

    result = []
    for p in precios:
        producto = db.query(Producto).filter(Producto.id == p.producto_id).first()
        proveedor = db.query(Proveedor).filter(Proveedor.id == p.proveedor_id).first()
        result.append({
            **p.__dict__,
            "producto_nombre": producto.nombre if producto else None,
            "proveedor_nombre": proveedor.nombre if proveedor else None
        })
    return result


@router.post("/precios", response_model=PrecioProveedorResponse, status_code=status.HTTP_201_CREATED)
async def create_precio(
    precio: PrecioProveedorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear nuevo precio de proveedor (solo admin)"""
    # Verificar que el proveedor existe
    proveedor = db.query(Proveedor).filter(Proveedor.id == precio.proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Verificar que el producto existe
    producto = db.query(Producto).filter(Producto.id == precio.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Verificar si ya existe un precio activo para esta combinación
    existing = db.query(PrecioProveedor).filter(
        PrecioProveedor.proveedor_id == precio.proveedor_id,
        PrecioProveedor.producto_id == precio.producto_id,
        PrecioProveedor.activo == True
    ).first()

    if existing:
        # Desactivar el precio anterior
        existing.activo = False

    new_precio = PrecioProveedor(**precio.model_dump())
    db.add(new_precio)
    db.commit()
    db.refresh(new_precio)

    return {
        **new_precio.__dict__,
        "producto_nombre": producto.nombre,
        "proveedor_nombre": proveedor.nombre
    }


@router.put("/precios/{precio_id}", response_model=PrecioProveedorResponse)
async def update_precio(
    precio_id: int,
    precio_data: PrecioProveedorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar precio de proveedor (solo admin)"""
    precio = db.query(PrecioProveedor).filter(PrecioProveedor.id == precio_id).first()
    if not precio:
        raise HTTPException(status_code=404, detail="Precio no encontrado")

    update_data = precio_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(precio, field, value)

    db.commit()
    db.refresh(precio)

    producto = db.query(Producto).filter(Producto.id == precio.producto_id).first()
    proveedor = db.query(Proveedor).filter(Proveedor.id == precio.proveedor_id).first()

    return {
        **precio.__dict__,
        "producto_nombre": producto.nombre if producto else None,
        "proveedor_nombre": proveedor.nombre if proveedor else None
    }


@router.delete("/precios/{precio_id}")
async def delete_precio(
    precio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Desactivar precio de proveedor (solo admin)"""
    precio = db.query(PrecioProveedor).filter(PrecioProveedor.id == precio_id).first()
    if not precio:
        raise HTTPException(status_code=404, detail="Precio no encontrado")

    precio.activo = False
    db.commit()

    return {"message": "Precio desactivado correctamente"}
