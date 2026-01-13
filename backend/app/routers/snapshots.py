from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import json

from ..database import get_db
from ..models import InventarioSnapshot, Inventario, Usuario, Producto
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/snapshots", tags=["Snapshots Históricos"])


@router.get("/inventario/{producto_id}")
async def get_snapshots_producto(
    producto_id: str,
    fecha_inicio: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD HH:MM:SS)"),
    fecha_fin: Optional[datetime] = Query(None, description="Fecha fin"),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener snapshots históricos de un producto"""
    query = db.query(InventarioSnapshot).filter(
        InventarioSnapshot.producto_id == producto_id
    )

    if fecha_inicio:
        query = query.filter(InventarioSnapshot.timestamp >= fecha_inicio)
    if fecha_fin:
        query = query.filter(InventarioSnapshot.timestamp <= fecha_fin)

    snapshots = query.order_by(InventarioSnapshot.timestamp.desc()).limit(limit).all()

    result = []
    for s in snapshots:
        datos = json.loads(s.datos_inventario)
        # Verificar integridad
        integridad_ok = InventarioSnapshot.verificar_integridad(datos, s.hash_verificacion)
        result.append({
            "id": s.id,
            "producto_id": s.producto_id,
            "timestamp": s.timestamp,
            "datos": datos,
            "tipo": s.tipo,
            "usuario_id": s.usuario_id,
            "integridad_verificada": integridad_ok,
            "alerta_integridad": not integridad_ok
        })

    return result


@router.get("/inventario/{producto_id}/fecha")
async def get_inventario_en_fecha(
    producto_id: str,
    fecha: datetime = Query(..., description="Fecha a consultar (YYYY-MM-DD HH:MM:SS)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener el estado del inventario en una fecha específica"""
    # Buscar el snapshot más cercano anterior a la fecha solicitada
    snapshot = db.query(InventarioSnapshot).filter(
        InventarioSnapshot.producto_id == producto_id,
        InventarioSnapshot.timestamp <= fecha
    ).order_by(InventarioSnapshot.timestamp.desc()).first()

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay registros históricos para {producto_id} antes de {fecha}"
        )

    datos = json.loads(snapshot.datos_inventario)
    integridad_ok = InventarioSnapshot.verificar_integridad(datos, snapshot.hash_verificacion)

    return {
        "producto_id": producto_id,
        "fecha_solicitada": fecha,
        "fecha_snapshot": snapshot.timestamp,
        "datos_inventario": datos,
        "integridad_verificada": integridad_ok,
        "alerta_integridad": not integridad_ok
    }


@router.post("/inventario/{producto_id}/crear")
async def crear_snapshot_manual(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear snapshot manual del inventario actual (solo admin)"""
    inventario = db.query(Inventario).filter(Inventario.producto_id == producto_id).first()
    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )

    # Crear datos del snapshot
    datos = {
        "boveda_trabajo": inventario.boveda_trabajo,
        "boveda_principal": inventario.boveda_principal,
        "en_proceso_cantidad": inventario.en_proceso_cantidad,
        "ordenes_activas": inventario.ordenes_activas,
        "dist_colocacion": inventario.dist_colocacion,
        "dist_normal": inventario.dist_normal,
        "dist_devoluciones": inventario.dist_devoluciones,
        "mod_colocacion": inventario.mod_colocacion,
        "mod_stock": inventario.mod_stock
    }

    snapshot = InventarioSnapshot(
        producto_id=producto_id,
        datos_inventario=json.dumps(datos),
        hash_verificacion=InventarioSnapshot.generar_hash(datos),
        tipo="manual",
        usuario_id=current_user.id
    )
    db.add(snapshot)
    db.commit()

    return {"message": "Snapshot creado correctamente", "snapshot_id": snapshot.id}


@router.get("/auditoria/verificar")
async def verificar_integridad_general(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Verificar integridad de todos los snapshots (auditoría)"""
    snapshots = db.query(InventarioSnapshot).all()

    total = len(snapshots)
    validos = 0
    alterados = []

    for s in snapshots:
        datos = json.loads(s.datos_inventario)
        if InventarioSnapshot.verificar_integridad(datos, s.hash_verificacion):
            validos += 1
        else:
            alterados.append({
                "id": s.id,
                "producto_id": s.producto_id,
                "timestamp": s.timestamp,
                "tipo": s.tipo
            })

    return {
        "total_snapshots": total,
        "snapshots_validos": validos,
        "snapshots_alterados": len(alterados),
        "integridad_sistema": len(alterados) == 0,
        "registros_alterados": alterados
    }
