from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import json

from ..database import get_db
from ..models import HistorialCaptura, Usuario, Inventario, InventarioSnapshot, CapturaAuditoria
from ..schemas.captura import CapturaCreate, CapturaResponse
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/capturas", tags=["Capturas"])


@router.get("/", response_model=List[CapturaResponse])
async def list_capturas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Listar todas las capturas (solo admin)"""
    capturas = db.query(HistorialCaptura).order_by(HistorialCaptura.fecha.desc()).all()
    result = []
    for c in capturas:
        usuario = db.query(Usuario).filter(Usuario.id == c.usuario_id).first()
        result.append({
            "id": c.id,
            "usuario_id": c.usuario_id,
            "usuario_nombre": usuario.nombre if usuario else None,
            "producto_id": c.producto_id,
            "area": c.area,
            "tipo": c.tipo,
            "valores": json.loads(c.valores),
            "fecha": c.fecha,
            "estatus": c.estatus,
            "ip_address": c.ip_address
        })
    return result


@router.get("/mis-capturas", response_model=List[CapturaResponse])
async def list_mis_capturas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar capturas del usuario actual"""
    capturas = db.query(HistorialCaptura).filter(
        HistorialCaptura.usuario_id == current_user.id
    ).order_by(HistorialCaptura.fecha.desc()).all()

    result = []
    for c in capturas:
        result.append({
            "id": c.id,
            "usuario_id": c.usuario_id,
            "usuario_nombre": current_user.nombre,
            "producto_id": c.producto_id,
            "area": c.area,
            "tipo": c.tipo,
            "valores": json.loads(c.valores),
            "fecha": c.fecha,
            "estatus": c.estatus,
            "ip_address": c.ip_address
        })
    return result


@router.post("/", response_model=CapturaResponse, status_code=status.HTTP_201_CREATED)
async def create_captura(
    captura: CapturaCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "tsys", "distribucion", "modulos"]))
):
    """Registrar nueva captura con auditoría y snapshot automático"""
    # Validar que el usuario tenga permiso para el área
    area_rol_map = {
        "TSYS": ["admin", "tsys"],
        "Distribucion": ["admin", "distribucion"],
        "Modulos": ["admin", "modulos"]
    }

    allowed_roles = area_rol_map.get(captura.area, ["admin"])
    if current_user.rol not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes permiso para capturar en el área {captura.area}"
        )

    # Obtener IP y User-Agent del cliente
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    # Crear la captura
    new_captura = HistorialCaptura(
        usuario_id=current_user.id,
        producto_id=captura.producto_id,
        area=captura.area,
        tipo=captura.tipo,
        valores=json.dumps(captura.valores),
        ip_address=client_ip,
        estatus="Aprobado"
    )
    db.add(new_captura)
    db.flush()  # Para obtener el ID antes del commit

    # Crear registro de auditoría inmutable
    datos_auditoria = {
        "captura_id": new_captura.id,
        "usuario_id": current_user.id,
        "usuario_nombre": current_user.nombre,
        "producto_id": captura.producto_id,
        "area": captura.area,
        "tipo": captura.tipo,
        "valores": captura.valores
    }

    auditoria = CapturaAuditoria(
        captura_id=new_captura.id,
        datos_originales=json.dumps(datos_auditoria),
        hash_integridad=CapturaAuditoria.generar_hash(datos_auditoria),
        ip_cliente=client_ip,
        user_agent=user_agent
    )
    db.add(auditoria)

    # Obtener o crear inventario para el producto
    inventario = db.query(Inventario).filter(Inventario.producto_id == captura.producto_id).first()

    if not inventario:
        # Crear inventario si no existe
        inventario = Inventario(producto_id=captura.producto_id)
        db.add(inventario)
        db.flush()

    # Crear snapshot ANTES de actualizar (para historial)
    datos_snapshot = {
        "boveda_trabajo": inventario.boveda_trabajo,
        "boveda_principal": inventario.boveda_principal,
        "en_proceso_cantidad": inventario.en_proceso_cantidad,
        "ordenes_activas": inventario.ordenes_activas,
        "dist_colocacion": inventario.dist_colocacion,
        "dist_normal": inventario.dist_normal,
        "dist_devoluciones": inventario.dist_devoluciones,
        "mod_colocacion": inventario.mod_colocacion,
        "mod_stock": inventario.mod_stock,
        "captura_origen_id": new_captura.id
    }

    snapshot = InventarioSnapshot(
        producto_id=captura.producto_id,
        datos_inventario=json.dumps(datos_snapshot),
        hash_verificacion=InventarioSnapshot.generar_hash(datos_snapshot),
        tipo="captura",
        usuario_id=current_user.id
    )
    db.add(snapshot)

    # ACTUALIZAR INVENTARIO según el área de captura
    valores = captura.valores

    if captura.area == "TSYS":
        # Actualizar datos de TSYS (bóvedas)
        if "boveda_trabajo" in valores:
            inventario.boveda_trabajo = valores["boveda_trabajo"]
        if "boveda_principal" in valores:
            inventario.boveda_principal = valores["boveda_principal"]

    elif captura.area == "Distribucion":
        # Actualizar datos de Distribución
        if "colocacion" in valores:
            inventario.dist_colocacion = valores["colocacion"]
        if "normal" in valores:
            inventario.dist_normal = valores["normal"]
        if "devoluciones" in valores:
            inventario.dist_devoluciones = valores["devoluciones"]
        # También puede actualizar stock de módulos si viene en la captura
        if "stock_seguridad_modulos" in valores:
            inventario.mod_stock = valores["stock_seguridad_modulos"]

    elif captura.area == "Modulos":
        # Actualizar datos de Módulos
        if "colocacion" in valores:
            inventario.mod_colocacion = valores["colocacion"]
        if "stock_seguridad" in valores:
            inventario.mod_stock = valores["stock_seguridad"]

    db.commit()
    db.refresh(new_captura)

    return {
        "id": new_captura.id,
        "usuario_id": new_captura.usuario_id,
        "usuario_nombre": current_user.nombre,
        "producto_id": new_captura.producto_id,
        "area": new_captura.area,
        "tipo": new_captura.tipo,
        "valores": json.loads(new_captura.valores),
        "fecha": new_captura.fecha,
        "estatus": new_captura.estatus,
        "ip_address": new_captura.ip_address
    }


@router.get("/{captura_id}", response_model=CapturaResponse)
async def get_captura(
    captura_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener detalle de una captura"""
    captura = db.query(HistorialCaptura).filter(HistorialCaptura.id == captura_id).first()
    if not captura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Captura no encontrada"
        )

    # Solo admin o el dueño pueden ver
    if current_user.rol != "admin" and captura.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver esta captura"
        )

    usuario = db.query(Usuario).filter(Usuario.id == captura.usuario_id).first()
    return {
        "id": captura.id,
        "usuario_id": captura.usuario_id,
        "usuario_nombre": usuario.nombre if usuario else None,
        "producto_id": captura.producto_id,
        "area": captura.area,
        "tipo": captura.tipo,
        "valores": json.loads(captura.valores),
        "fecha": captura.fecha,
        "estatus": captura.estatus,
        "ip_address": captura.ip_address
    }
