from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Usuario, InventarioHistorial, InventarioHistorialAuditoria
from ..schemas.inventario_historial import (
    InventarioHistorialCreate,
    InventarioHistorialUpdate,
    InventarioHistorialResponse,
    InventarioHistorialAuditoriaResponse,
    InventarioComparativoResponse,
    ComparativoMes
)
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/inventario-historial", tags=["Inventario Historial"])

# Mapeo de mes numérico a abreviatura
MES_ABREV = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
}


def get_mes_formato(mes: int, anio: int) -> str:
    """Retorna el mes en formato 'Mes-YY'"""
    return f"{MES_ABREV.get(mes, 'Ene')}-{str(anio)[-2:]}"


def calcular_total(registro: InventarioHistorial) -> int:
    """Calcula el total según el área"""
    if registro.area == 'tsys':
        return (registro.boveda_trabajo or 0) + (registro.boveda_principal or 0) + (registro.trasco_rep or 0)
    elif registro.area == 'distribucion':
        return (registro.dist_colocacion or 0) + (registro.dist_normal or 0) + (registro.dist_devoluciones or 0)
    elif registro.area == 'modulos':
        return (registro.mod_colocacion or 0) + (registro.mod_normal or 0) + (registro.mod_stock or 0)
    return 0


def registrar_auditoria(
    db: Session,
    historial_id: int,
    campo: str,
    valor_anterior: Optional[int],
    valor_nuevo: Optional[int],
    usuario_id: int,
    ip_address: Optional[str] = None
):
    """Registra un cambio en la auditoría"""
    auditoria = InventarioHistorialAuditoria(
        historial_id=historial_id,
        campo=campo,
        valor_anterior=valor_anterior,
        valor_nuevo=valor_nuevo,
        usuario_id=usuario_id,
        ip_address=ip_address
    )
    db.add(auditoria)


@router.get("/{producto_id}", response_model=List[InventarioHistorialResponse])
async def get_historial_producto(
    producto_id: str,
    area: Optional[str] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener historial de un producto.
    Filtros opcionales: area (tsys, distribucion, modulos), anio
    """
    query = db.query(InventarioHistorial).filter(
        InventarioHistorial.producto_id == producto_id
    )

    if area:
        query = query.filter(InventarioHistorial.area == area)
    if anio:
        query = query.filter(InventarioHistorial.anio == anio)

    registros = query.order_by(
        InventarioHistorial.anio,
        InventarioHistorial.mes
    ).all()

    # Agregar campos calculados
    result = []
    for r in registros:
        response = InventarioHistorialResponse(
            id=r.id,
            producto_id=r.producto_id,
            mes=r.mes,
            anio=r.anio,
            area=r.area,
            mes_formato=get_mes_formato(r.mes, r.anio),
            boveda_trabajo=r.boveda_trabajo or 0,
            boveda_principal=r.boveda_principal or 0,
            trasco_rep=r.trasco_rep or 0,
            dist_colocacion=r.dist_colocacion or 0,
            dist_normal=r.dist_normal or 0,
            dist_devoluciones=r.dist_devoluciones or 0,
            mod_colocacion=r.mod_colocacion or 0,
            mod_normal=r.mod_normal or 0,
            mod_stock=r.mod_stock or 0,
            total=calcular_total(r),
            usuario_id=r.usuario_id,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        result.append(response)

    return result


@router.get("/{producto_id}/comparativo", response_model=InventarioComparativoResponse)
async def get_comparativo(
    producto_id: str,
    area: str,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener datos comparativos para gráficas y tablas.
    Retorna datos mensuales ordenados cronológicamente.
    """
    query = db.query(InventarioHistorial).filter(
        InventarioHistorial.producto_id == producto_id,
        InventarioHistorial.area == area
    )

    if anio:
        query = query.filter(InventarioHistorial.anio == anio)

    registros = query.order_by(
        InventarioHistorial.anio,
        InventarioHistorial.mes
    ).all()

    meses = []
    for r in registros:
        meses.append(ComparativoMes(
            mes=r.mes,
            anio=r.anio,
            mes_formato=get_mes_formato(r.mes, r.anio),
            boveda_trabajo=r.boveda_trabajo or 0,
            boveda_principal=r.boveda_principal or 0,
            trasco_rep=r.trasco_rep or 0,
            dist_colocacion=r.dist_colocacion or 0,
            dist_normal=r.dist_normal or 0,
            dist_devoluciones=r.dist_devoluciones or 0,
            mod_colocacion=r.mod_colocacion or 0,
            mod_normal=r.mod_normal or 0,
            mod_stock=r.mod_stock or 0,
            total=calcular_total(r)
        ))

    # Calcular variación porcentual
    variacion = None
    if len(meses) >= 2:
        ultimo = meses[-1].total
        penultimo = meses[-2].total
        if penultimo > 0:
            variacion = round(((ultimo - penultimo) / penultimo) * 100, 1)

    return InventarioComparativoResponse(
        producto_id=producto_id,
        area=area,
        meses=meses,
        variacion_porcentual=variacion
    )


@router.post("/", response_model=InventarioHistorialResponse)
async def create_historial(
    data: InventarioHistorialCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Crear un nuevo registro de historial.
    Si ya existe para ese producto/mes/año/área, actualiza en su lugar.
    """
    # Verificar si ya existe
    existing = db.query(InventarioHistorial).filter(
        and_(
            InventarioHistorial.producto_id == data.producto_id,
            InventarioHistorial.mes == data.mes,
            InventarioHistorial.anio == data.anio,
            InventarioHistorial.area == data.area
        )
    ).first()

    if existing:
        # Actualizar existente
        return await update_historial(existing.id, InventarioHistorialUpdate(
            boveda_trabajo=data.boveda_trabajo,
            boveda_principal=data.boveda_principal,
            trasco_rep=data.trasco_rep,
            dist_colocacion=data.dist_colocacion,
            dist_normal=data.dist_normal,
            dist_devoluciones=data.dist_devoluciones,
            mod_colocacion=data.mod_colocacion,
            mod_normal=data.mod_normal,
            mod_stock=data.mod_stock
        ), request, db, current_user)

    # Crear nuevo
    historial = InventarioHistorial(
        producto_id=data.producto_id,
        mes=data.mes,
        anio=data.anio,
        area=data.area,
        boveda_trabajo=data.boveda_trabajo,
        boveda_principal=data.boveda_principal,
        trasco_rep=data.trasco_rep,
        dist_colocacion=data.dist_colocacion,
        dist_normal=data.dist_normal,
        dist_devoluciones=data.dist_devoluciones,
        mod_colocacion=data.mod_colocacion,
        mod_normal=data.mod_normal,
        mod_stock=data.mod_stock,
        usuario_id=current_user.id
    )
    db.add(historial)
    db.commit()
    db.refresh(historial)

    # Registrar creación en auditoría
    ip = request.client.host if request.client else None
    registrar_auditoria(
        db, historial.id, 'CREACION', None, calcular_total(historial),
        current_user.id, ip
    )
    db.commit()

    return InventarioHistorialResponse(
        id=historial.id,
        producto_id=historial.producto_id,
        mes=historial.mes,
        anio=historial.anio,
        area=historial.area,
        mes_formato=get_mes_formato(historial.mes, historial.anio),
        boveda_trabajo=historial.boveda_trabajo or 0,
        boveda_principal=historial.boveda_principal or 0,
        trasco_rep=historial.trasco_rep or 0,
        dist_colocacion=historial.dist_colocacion or 0,
        dist_normal=historial.dist_normal or 0,
        dist_devoluciones=historial.dist_devoluciones or 0,
        mod_colocacion=historial.mod_colocacion or 0,
        mod_normal=historial.mod_normal or 0,
        mod_stock=historial.mod_stock or 0,
        total=calcular_total(historial),
        usuario_id=historial.usuario_id,
        created_at=historial.created_at,
        updated_at=historial.updated_at
    )


@router.put("/{id}", response_model=InventarioHistorialResponse)
async def update_historial(
    id: int,
    data: InventarioHistorialUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Actualizar un registro de historial.
    Registra cada cambio en auditoría.
    """
    historial = db.query(InventarioHistorial).filter(
        InventarioHistorial.id == id
    ).first()

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )

    ip = request.client.host if request.client else None
    campos_actualizados = []

    # Mapeo de campos por área
    campos = {
        'tsys': ['boveda_trabajo', 'boveda_principal', 'trasco_rep'],
        'distribucion': ['dist_colocacion', 'dist_normal', 'dist_devoluciones'],
        'modulos': ['mod_colocacion', 'mod_normal', 'mod_stock']
    }

    # Actualizar solo campos correspondientes al área
    for campo in campos.get(historial.area, []):
        nuevo_valor = getattr(data, campo, None)
        if nuevo_valor is not None:
            valor_anterior = getattr(historial, campo)
            if valor_anterior != nuevo_valor:
                registrar_auditoria(
                    db, historial.id, campo, valor_anterior, nuevo_valor,
                    current_user.id, ip
                )
                setattr(historial, campo, nuevo_valor)
                campos_actualizados.append(campo)

    if campos_actualizados:
        historial.usuario_id = current_user.id
        db.commit()
        db.refresh(historial)

    return InventarioHistorialResponse(
        id=historial.id,
        producto_id=historial.producto_id,
        mes=historial.mes,
        anio=historial.anio,
        area=historial.area,
        mes_formato=get_mes_formato(historial.mes, historial.anio),
        boveda_trabajo=historial.boveda_trabajo or 0,
        boveda_principal=historial.boveda_principal or 0,
        trasco_rep=historial.trasco_rep or 0,
        dist_colocacion=historial.dist_colocacion or 0,
        dist_normal=historial.dist_normal or 0,
        dist_devoluciones=historial.dist_devoluciones or 0,
        mod_colocacion=historial.mod_colocacion or 0,
        mod_normal=historial.mod_normal or 0,
        mod_stock=historial.mod_stock or 0,
        total=calcular_total(historial),
        usuario_id=historial.usuario_id,
        created_at=historial.created_at,
        updated_at=historial.updated_at
    )


@router.get("/{id}/auditoria", response_model=List[InventarioHistorialAuditoriaResponse])
async def get_auditoria(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener historial de cambios (auditoría) de un registro.
    """
    # Verificar que el registro existe
    historial = db.query(InventarioHistorial).filter(
        InventarioHistorial.id == id
    ).first()

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )

    auditorias = db.query(InventarioHistorialAuditoria).filter(
        InventarioHistorialAuditoria.historial_id == id
    ).order_by(InventarioHistorialAuditoria.created_at.desc()).all()

    result = []
    for a in auditorias:
        usuario_nombre = None
        if a.usuario:
            usuario_nombre = a.usuario.nombre

        result.append(InventarioHistorialAuditoriaResponse(
            id=a.id,
            historial_id=a.historial_id,
            campo=a.campo,
            valor_anterior=a.valor_anterior,
            valor_nuevo=a.valor_nuevo,
            usuario_id=a.usuario_id,
            usuario_nombre=usuario_nombre,
            ip_address=a.ip_address,
            created_at=a.created_at
        ))

    return result


@router.delete("/{id}")
async def delete_historial(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """
    Eliminar un registro de historial (solo admin).
    También elimina los registros de auditoría asociados.
    """
    historial = db.query(InventarioHistorial).filter(
        InventarioHistorial.id == id
    ).first()

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )

    # Eliminar auditorías primero
    db.query(InventarioHistorialAuditoria).filter(
        InventarioHistorialAuditoria.historial_id == id
    ).delete()

    # Eliminar registro
    db.delete(historial)
    db.commit()

    return {"message": "Registro eliminado correctamente"}


@router.get("/{producto_id}/resumen")
async def get_resumen_historial(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener resumen del historial de un producto.
    """
    registros = db.query(InventarioHistorial).filter(
        InventarioHistorial.producto_id == producto_id
    ).all()

    if not registros:
        return {
            "producto_id": producto_id,
            "ultimo_registro": None,
            "meses_registrados": 0,
            "areas_con_datos": []
        }

    areas = set(r.area for r in registros)
    ultimo = max(registros, key=lambda r: r.updated_at or r.created_at)

    return {
        "producto_id": producto_id,
        "ultimo_registro": ultimo.updated_at or ultimo.created_at,
        "meses_registrados": len(registros),
        "areas_con_datos": list(areas)
    }
