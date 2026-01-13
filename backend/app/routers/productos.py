from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Producto, Proveedor
from ..schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from ..utils.dependencies import get_current_active_user, require_role
from ..models import Usuario

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/", response_model=List[ProductoResponse])
async def list_productos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todos los productos"""
    productos = db.query(Producto).all()
    result = []
    for p in productos:
        proveedor = db.query(Proveedor).filter(Proveedor.id == p.proveedor_id).first()
        result.append({
            **p.__dict__,
            "proveedor_nombre": proveedor.nombre if proveedor else None
        })
    return result


@router.get("/{producto_id}", response_model=ProductoResponse)
async def get_producto(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener producto por ID (SKU)"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    proveedor = db.query(Proveedor).filter(Proveedor.id == producto.proveedor_id).first()
    return {
        **producto.__dict__,
        "proveedor_nombre": proveedor.nombre if proveedor else None
    }


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_producto(
    producto: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear nuevo producto (solo admin)"""
    # Verificar ID único
    existing = db.query(Producto).filter(Producto.id == producto.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El SKU del producto ya existe"
        )

    # Verificar proveedor existe
    proveedor = db.query(Proveedor).filter(Proveedor.id == producto.proveedor_id).first()
    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proveedor no encontrado"
        )

    new_producto = Producto(**producto.model_dump())
    db.add(new_producto)
    db.commit()
    db.refresh(new_producto)
    return {
        **new_producto.__dict__,
        "proveedor_nombre": proveedor.nombre
    }


@router.put("/{producto_id}", response_model=ProductoResponse)
async def update_producto(
    producto_id: str,
    producto_data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar producto (solo admin)"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )

    update_data = producto_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(producto, field, value)

    db.commit()
    db.refresh(producto)

    proveedor = db.query(Proveedor).filter(Proveedor.id == producto.proveedor_id).first()
    return {
        **producto.__dict__,
        "proveedor_nombre": proveedor.nombre if proveedor else None
    }


@router.delete("/{producto_id}")
async def delete_producto(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Desactivar producto (solo admin)"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )

    producto.activo = False
    db.commit()
    return {"message": "Producto desactivado correctamente"}
