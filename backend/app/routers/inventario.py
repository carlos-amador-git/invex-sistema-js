from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import List

from ..database import get_db
from ..models import Inventario, Forecast, Usuario, ProcesoBAU, ColocacionHistorial, InventarioHistorial, InventarioHistorialAuditoria
from ..models.orden import OrdenCompra
from datetime import datetime
from ..schemas.inventario import InventarioResponse, InventarioTSYS, InventarioDistribucion, InventarioModulos
from ..schemas.forecast import ForecastResponse
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/inventario", tags=["Inventario"])

# Mapeo de mes numérico a abreviatura
MES_ABREV = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
}


@router.get("/", response_model=List[InventarioResponse])
async def list_inventario(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar inventario de todos los productos"""
    return db.query(Inventario).all()


@router.get("/{producto_id}", response_model=InventarioResponse)
async def get_inventario(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener inventario de un producto"""
    inventario = db.query(Inventario).filter(Inventario.producto_id == producto_id).first()
    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventario no encontrado para este producto"
        )
    return inventario


@router.get("/{producto_id}/forecast", response_model=List[ForecastResponse])
async def get_forecast(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener forecast de un producto"""
    forecast = db.query(Forecast).filter(Forecast.producto_id == producto_id).all()
    return forecast


@router.put("/{producto_id}/tsys", response_model=InventarioResponse)
async def update_inventario_tsys(
    producto_id: str,
    data: InventarioTSYS,
    mes: int = None,
    anio: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "tsys"]))
):
    """Actualizar inventario TSYS. Si se especifica mes/año, también guarda en historial."""
    inventario = db.query(Inventario).filter(Inventario.producto_id == producto_id).first()
    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventario no encontrado para este producto"
        )

    inventario.boveda_trabajo = data.boveda_trabajo
    inventario.boveda_principal = data.boveda_principal
    if data.trasco_rep is not None:
        inventario.trasco_rep = data.trasco_rep

    # Si se especifica mes/año, guardar en historial
    if mes and anio:
        historial = db.query(InventarioHistorial).filter(
            InventarioHistorial.producto_id == producto_id,
            InventarioHistorial.mes == mes,
            InventarioHistorial.anio == anio,
            InventarioHistorial.area == 'tsys'
        ).first()

        if historial:
            # Actualizar existente
            historial.boveda_trabajo = data.boveda_trabajo
            historial.boveda_principal = data.boveda_principal
            historial.trasco_rep = data.trasco_rep or 0
            historial.usuario_id = current_user.id
        else:
            # Crear nuevo
            historial = InventarioHistorial(
                producto_id=producto_id,
                mes=mes,
                anio=anio,
                area='tsys',
                boveda_trabajo=data.boveda_trabajo,
                boveda_principal=data.boveda_principal,
                trasco_rep=data.trasco_rep or 0,
                usuario_id=current_user.id
            )
            db.add(historial)

    db.commit()
    db.refresh(inventario)
    return inventario


@router.put("/{producto_id}/distribucion", response_model=InventarioResponse)
async def update_inventario_distribucion(
    producto_id: str,
    data: InventarioDistribucion,
    mes: int = None,
    anio: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "distribucion"]))
):
    """Actualizar inventario de Distribución. Si se especifica mes/año, también guarda en historial."""
    inventario = db.query(Inventario).filter(Inventario.producto_id == producto_id).first()
    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventario no encontrado para este producto"
        )

    inventario.dist_colocacion = data.dist_colocacion
    inventario.dist_normal = data.dist_normal
    inventario.dist_devoluciones = data.dist_devoluciones

    # Distribución puede capturar stock de seguridad que se refleja en Módulos
    if data.stock_seguridad_modulos is not None:
        inventario.mod_stock = data.stock_seguridad_modulos

    # Si se especifica mes/año, guardar en historial
    if mes and anio:
        historial = db.query(InventarioHistorial).filter(
            InventarioHistorial.producto_id == producto_id,
            InventarioHistorial.mes == mes,
            InventarioHistorial.anio == anio,
            InventarioHistorial.area == 'distribucion'
        ).first()

        if historial:
            # Actualizar existente
            historial.dist_colocacion = data.dist_colocacion
            historial.dist_normal = data.dist_normal
            historial.dist_devoluciones = data.dist_devoluciones
            historial.usuario_id = current_user.id
        else:
            # Crear nuevo
            historial = InventarioHistorial(
                producto_id=producto_id,
                mes=mes,
                anio=anio,
                area='distribucion',
                dist_colocacion=data.dist_colocacion,
                dist_normal=data.dist_normal,
                dist_devoluciones=data.dist_devoluciones,
                usuario_id=current_user.id
            )
            db.add(historial)

    db.commit()
    db.refresh(inventario)
    return inventario


@router.put("/{producto_id}/modulos", response_model=InventarioResponse)
async def update_inventario_modulos(
    producto_id: str,
    data: InventarioModulos,
    mes: int = None,
    anio: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "modulos"]))
):
    """Actualizar inventario de Módulos. Si se especifica mes/año, también guarda en historial."""
    inventario = db.query(Inventario).filter(Inventario.producto_id == producto_id).first()
    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventario no encontrado para este producto"
        )

    inventario.mod_colocacion = data.mod_colocacion
    inventario.mod_normal = data.mod_normal
    inventario.mod_stock = data.mod_stock

    # Si se especifica mes/año, guardar en historial
    if mes and anio:
        historial = db.query(InventarioHistorial).filter(
            InventarioHistorial.producto_id == producto_id,
            InventarioHistorial.mes == mes,
            InventarioHistorial.anio == anio,
            InventarioHistorial.area == 'modulos'
        ).first()

        if historial:
            # Actualizar existente
            historial.mod_colocacion = data.mod_colocacion
            historial.mod_normal = data.mod_normal
            historial.mod_stock = data.mod_stock
            historial.usuario_id = current_user.id
        else:
            # Crear nuevo
            historial = InventarioHistorial(
                producto_id=producto_id,
                mes=mes,
                anio=anio,
                area='modulos',
                mod_colocacion=data.mod_colocacion,
                mod_normal=data.mod_normal,
                mod_stock=data.mod_stock,
                usuario_id=current_user.id
            )
            db.add(historial)

    db.commit()
    db.refresh(inventario)
    return inventario


@router.post("/sync-forecast")
async def sync_forecast_from_bau(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """
    Sincronizar forecast con datos de Procesos BAU.
    Actualiza trasco_rep, btb, renov_anticipada y recalcula disponibilidad.
    """
    # Obtener todos los procesos BAU agrupados por producto/mes/año
    procesos = db.query(ProcesoBAU).all()

    # Agrupar por producto_id, mes, anio
    bau_data = {}
    for p in procesos:
        key = (p.producto_id, p.mes, p.anio)
        if key not in bau_data:
            bau_data[key] = {'trascodificacion': 0, 'btb': 0, 'renovacion_anticipada': 0}
        bau_data[key][p.tipo_proceso] = p.cantidad

    updated = 0
    created = 0

    # Agrupar por producto para calcular disponibilidad acumulada
    productos_procesados = set()

    for (producto_id, mes_num, anio), valores in bau_data.items():
        productos_procesados.add(producto_id)
        # Convertir mes/año a formato de forecast (Ene-25, Feb-26, etc.)
        mes_str = f"{MES_ABREV.get(mes_num, 'Ene')}-{str(anio)[-2:]}"

        # Buscar forecast existente
        forecast = db.query(Forecast).filter(
            Forecast.producto_id == producto_id,
            Forecast.mes == mes_str
        ).first()

        # Obtener colocación del historial para este mes
        colocacion_hist = db.query(ColocacionHistorial).filter(
            ColocacionHistorial.producto_id == producto_id,
            ColocacionHistorial.mes == mes_str
        ).first()

        if colocacion_hist:
            # Usar colocación del historial
            colocacion = colocacion_hist.colocacion_total
        else:
            # Si no existe en historial, usar la del inventario y crear registro
            inventario = db.query(Inventario).filter(
                Inventario.producto_id == producto_id
            ).first()
            colocacion = ((inventario.dist_colocacion or 0) + (inventario.mod_colocacion or 0)) if inventario else 0

            # Crear registro en historial
            new_hist = ColocacionHistorial(
                producto_id=producto_id,
                mes=mes_str,
                colocacion_dist=inventario.dist_colocacion if inventario else 0,
                colocacion_mod=inventario.mod_colocacion if inventario else 0,
                colocacion_total=colocacion
            )
            db.add(new_hist)

        if forecast:
            # Actualizar valores BAU
            forecast.trasco_rep = valores['trascodificacion']
            forecast.btb = valores['btb']
            forecast.renov_anticipada = valores['renovacion_anticipada']
            forecast.colocacion = colocacion
            # Recalcular total
            forecast.forecast_total = (
                forecast.colocacion +
                forecast.trasco_rep +
                forecast.btb +
                forecast.renov_anticipada
            )
            updated += 1
        else:
            # Crear nuevo registro de forecast
            new_forecast = Forecast(
                producto_id=producto_id,
                mes=mes_str,
                colocacion=colocacion,
                trasco_rep=valores['trascodificacion'],
                btb=valores['btb'],
                renov_anticipada=valores['renovacion_anticipada'],
                forecast_total=colocacion + valores['trascodificacion'] + valores['btb'] + valores['renovacion_anticipada'],
                disponible_con_compra=0,
                disponible_sin_compra=0,
                atiende_con_compra=True,
                atiende_sin_compra=False
            )
            db.add(new_forecast)
            created += 1

    db.commit()

    # Recalcular disponibilidad para cada producto
    for producto_id in productos_procesados:
        inventario = db.query(Inventario).filter(
            Inventario.producto_id == producto_id
        ).first()

        if not inventario:
            continue

        # TSYS = Inventario en almacén (sin compras pendientes)
        tsys_total = (
            (inventario.boveda_trabajo or 0) +
            (inventario.boveda_principal or 0) +
            (inventario.trasco_rep or 0)
        )

        # PROCESO = Órdenes en compra + en producción
        proceso_total = (
            (inventario.ordenes_activas or 0) +
            (inventario.en_proceso_cantidad or 0)
        )

        # VIRGEN = TSYS + PROCESO (inventario con compras)
        virgen_total = tsys_total + proceso_total

        # Obtener forecast del producto ordenado por fecha
        forecasts = db.query(Forecast).filter(
            Forecast.producto_id == producto_id
        ).all()

        # Ordenar por año/mes
        def sort_key(f):
            mes_orden = {'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 'Jun': 6,
                        'Jul': 7, 'Ago': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dic': 12}
            parts = f.mes.split('-')
            if len(parts) == 2:
                mes = mes_orden.get(parts[0], 1)
                anio = int(parts[1]) + 2000
                return anio * 100 + mes
            return 0

        forecasts.sort(key=sort_key)

        # Calcular disponibilidad acumulada
        # disponible_con = Inicia con VIRGEN y resta forecast cada mes
        # disponible_sin = Inicia con TSYS y resta forecast cada mes
        disponible_con = virgen_total
        disponible_sin = tsys_total
        mes_alerta = None

        for fc in forecasts:
            demanda = fc.forecast_total or 0

            # Restar la demanda del mes
            disponible_con -= demanda
            disponible_sin -= demanda

            # Guardar valores (pueden ser negativos)
            fc.disponible_con_compra = disponible_con
            fc.disponible_sin_compra = disponible_sin

            # Atiendo si la disponibilidad es > 110% del forecast (margen > 10%)
            # Alerta cuando disponibilidad <= 110% del forecast (margen <= 10%)
            umbral_alerta = demanda * 1.1 if demanda > 0 else 0
            fc.atiende_con_compra = disponible_con > umbral_alerta
            fc.atiende_sin_compra = disponible_sin > umbral_alerta

            # Identificar mes de alerta (primer mes que no atiende con compra)
            if not fc.atiende_con_compra and mes_alerta is None:
                mes_alerta = fc.mes

        # Actualizar mes de alerta en inventario
        if inventario and mes_alerta:
            inventario.mes_alerta = mes_alerta

    db.commit()

    return {
        "message": "Sincronización completada",
        "actualizados": updated,
        "creados": created,
        "total_procesados": len(bau_data),
        "productos_actualizados": len(productos_procesados)
    }


@router.post("/sync-ordenes")
async def sync_inventario_from_ordenes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """
    Sincronizar inventario en proceso desde órdenes de compra.
    - COMPRA: Órdenes validadas para compra
    - EN PROCESO: Órdenes en producción
    """
    # Obtener órdenes agrupadas por producto y estatus
    ordenes = db.query(OrdenCompra).filter(
        OrdenCompra.estatus.in_(['COMPRA', 'EN PROCESO'])
    ).all()

    # Agrupar por producto
    inventario_proceso = {}
    for orden in ordenes:
        if orden.producto_id not in inventario_proceso:
            inventario_proceso[orden.producto_id] = {
                'compra': 0,
                'produccion': 0,
                'total': 0
            }

        if orden.estatus == 'COMPRA':
            inventario_proceso[orden.producto_id]['compra'] += orden.cantidad or 0
        elif orden.estatus == 'EN PROCESO':
            inventario_proceso[orden.producto_id]['produccion'] += orden.cantidad or 0

        inventario_proceso[orden.producto_id]['total'] += orden.cantidad or 0

    # Actualizar inventarios
    productos_actualizados = 0
    for producto_id, cantidades in inventario_proceso.items():
        inventario = db.query(Inventario).filter(
            Inventario.producto_id == producto_id
        ).first()

        if inventario:
            inventario.ordenes_activas = cantidades['compra']
            inventario.en_proceso_cantidad = cantidades['produccion']
            productos_actualizados += 1
        else:
            # Crear inventario si no existe
            nuevo_inv = Inventario(
                producto_id=producto_id,
                ordenes_activas=cantidades['compra'],
                en_proceso_cantidad=cantidades['produccion']
            )
            db.add(nuevo_inv)
            productos_actualizados += 1

    db.commit()

    # Calcular totales
    total_compra = sum(v['compra'] for v in inventario_proceso.values())
    total_produccion = sum(v['produccion'] for v in inventario_proceso.values())

    return {
        "message": "Sincronización de órdenes completada",
        "productos_actualizados": productos_actualizados,
        "total_en_compra": total_compra,
        "total_en_produccion": total_produccion,
        "total_en_proceso": total_compra + total_produccion
    }


@router.get("/{producto_id}/resumen")
async def get_resumen_inventario(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener resumen de inventario con desglose completo:
    - TSYS: Trasco/Rep + Inmediatos (bóveda trabajo + bóveda principal)
    - EN PROCESO: Compra + Producción (desde órdenes)
    - VIRGEN: PROCESO + TSYS
    - VENTA: Distribución + Módulos
    - CADENA: VIRGEN + VENTA
    """
    inventario = db.query(Inventario).filter(
        Inventario.producto_id == producto_id
    ).first()

    if not inventario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventario no encontrado"
        )

    # Calcular componentes
    # TSYS
    trasco_rep = inventario.trasco_rep or 0
    boveda_trabajo = inventario.boveda_trabajo or 0
    boveda_principal = inventario.boveda_principal or 0
    inmediatos = boveda_trabajo + boveda_principal
    tsys_total = trasco_rep + inmediatos

    # EN PROCESO (desde órdenes)
    en_compra = inventario.ordenes_activas or 0
    en_produccion = inventario.en_proceso_cantidad or 0
    proceso_total = en_compra + en_produccion

    # VIRGEN
    virgen = proceso_total + tsys_total

    # VENTA
    dist_total = (inventario.dist_colocacion or 0) + (inventario.dist_normal or 0)
    mod_total = (inventario.mod_colocacion or 0) + (inventario.mod_stock or 0)
    venta = dist_total + mod_total

    # CADENA
    cadena = virgen + venta

    return {
        "producto_id": producto_id,
        "tsys": {
            "trasco_rep": trasco_rep,
            "inmediatos": {
                "boveda_trabajo": boveda_trabajo,
                "boveda_principal": boveda_principal,
                "total": inmediatos
            },
            "total": tsys_total
        },
        "proceso": {
            "en_compra": en_compra,
            "en_produccion": en_produccion,
            "total": proceso_total
        },
        "virgen": virgen,
        "venta": {
            "distribucion": dist_total,
            "modulos": mod_total,
            "total": venta
        },
        "cadena": cadena
    }
