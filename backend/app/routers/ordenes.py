from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from ..database import get_db
from ..utils.pdf_generator import generate_solicitud_from_orden


def parse_date(value):
    """Convertir string de fecha a objeto date de Python"""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        if not value or value.strip() == '':
            return None
        try:
            # Formato ISO: YYYY-MM-DD
            return datetime.strptime(value.strip(), '%Y-%m-%d').date()
        except ValueError:
            try:
                # Formato DD/MM/YYYY
                return datetime.strptime(value.strip(), '%d/%m/%Y').date()
            except ValueError:
                return None
    return None
from ..models import OrdenCompra, EntregaParcial, Producto, Proveedor, Usuario
from ..models.orden import OrdenHistorial
from ..schemas.orden import (
    OrdenCreate, OrdenUpdate, OrdenResponse,
    EntregaParcialCreate, EntregaParcialUpdate, EntregaParcialResponse,
    OrdenImportResult, HistorialResponse
)
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/ordenes", tags=["Órdenes de Compra"])


def registrar_historial(
    db: Session,
    orden_id: str,
    accion: str,
    campo: str = "general",
    valor_anterior: str = None,
    valor_nuevo: str = None,
    usuario: Usuario = None
):
    """Registrar cambio en el historial de auditoría"""
    historial = OrdenHistorial(
        orden_id=orden_id,
        campo=campo,
        valor_anterior=str(valor_anterior) if valor_anterior is not None else None,
        valor_nuevo=str(valor_nuevo) if valor_nuevo is not None else None,
        usuario_id=usuario.id if usuario else None,
        usuario_nombre=usuario.username if usuario else None,
        accion=accion
    )
    db.add(historial)
    return historial


def enrich_orden(orden, db):
    """Agregar información adicional a la orden"""
    producto = db.query(Producto).filter(Producto.id == orden.producto_id).first()
    proveedor = db.query(Proveedor).filter(Proveedor.id == orden.proveedor_id).first()

    # Cargar entregas parciales
    entregas = db.query(EntregaParcial).filter(
        EntregaParcial.orden_id == orden.id
    ).order_by(EntregaParcial.numero_entrega).all()

    # Calcular cantidades
    cantidad_entregada = sum(e.cantidad for e in entregas if e.estatus in ['PAGADA', 'ENTREGADA'])
    cantidad_pendiente = orden.cantidad - cantidad_entregada

    return {
        **orden.__dict__,
        "producto_nombre": producto.nombre if producto else None,
        "proveedor_nombre": proveedor.nombre if proveedor else None,
        "entregas": [EntregaParcialResponse.model_validate(e) for e in entregas],
        "cantidad_entregada": cantidad_entregada,
        "cantidad_pendiente": max(0, cantidad_pendiente)
    }


@router.get("/", response_model=List[OrdenResponse])
async def list_ordenes(
    tipo_material: Optional[str] = Query(None),
    presupuesto: Optional[str] = Query(None),
    proveedor_id: Optional[int] = Query(None),
    estatus: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todas las órdenes de compra con filtros opcionales"""
    query = db.query(OrdenCompra)

    if tipo_material:
        query = query.filter(OrdenCompra.tipo_material == tipo_material)
    if presupuesto:
        query = query.filter(OrdenCompra.presupuesto.ilike(f"%{presupuesto}%"))
    if proveedor_id:
        query = query.filter(OrdenCompra.proveedor_id == proveedor_id)
    if estatus:
        query = query.filter(OrdenCompra.estatus == estatus)
    if search:
        query = query.filter(or_(
            OrdenCompra.id.ilike(f"%{search}%"),
            OrdenCompra.producto_id.ilike(f"%{search}%"),
            OrdenCompra.nombre_producto.ilike(f"%{search}%"),
            OrdenCompra.requi.ilike(f"%{search}%")
        ))

    ordenes = query.order_by(OrdenCompra.fecha_orden.desc()).all()
    return [enrich_orden(o, db) for o in ordenes]


@router.get("/{orden_id}", response_model=OrdenResponse)
async def get_orden(
    orden_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener orden de compra por ID"""
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )
    return enrich_orden(orden, db)


@router.post("/", response_model=OrdenResponse, status_code=status.HTTP_201_CREATED)
async def create_orden(
    orden: OrdenCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear nueva orden de compra"""
    existing = db.query(OrdenCompra).filter(OrdenCompra.id == orden.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID de la orden ya existe"
        )

    producto = db.query(Producto).filter(Producto.id == orden.producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Producto no encontrado"
        )

    proveedor = db.query(Proveedor).filter(Proveedor.id == orden.proveedor_id).first()
    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proveedor no encontrado"
        )

    new_orden = OrdenCompra(**orden.model_dump())
    db.add(new_orden)

    # Registrar en historial
    registrar_historial(
        db, orden.id, "CREATE", "orden",
        None, f"Orden creada: {orden.cantidad} unidades",
        current_user
    )

    db.commit()
    db.refresh(new_orden)

    return enrich_orden(new_orden, db)


@router.put("/{orden_id}", response_model=OrdenResponse)
async def update_orden(
    orden_id: str,
    orden_data: OrdenUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar orden de compra"""
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )

    update_data = orden_data.model_dump(exclude_unset=True)

    # Registrar cambios en historial
    for field, new_value in update_data.items():
        old_value = getattr(orden, field, None)
        if str(old_value) != str(new_value):
            accion = "STATUS_CHANGE" if field == "estatus" else "UPDATE"
            registrar_historial(
                db, orden_id, accion, field,
                old_value, new_value, current_user
            )
        setattr(orden, field, new_value)

    db.commit()
    db.refresh(orden)

    return enrich_orden(orden, db)


@router.delete("/{orden_id}")
async def delete_orden(
    orden_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Eliminar orden de compra"""
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )

    # Guardar info para historial antes de eliminar
    info_orden = f"Producto: {orden.producto_id}, Cantidad: {orden.cantidad}, Estatus: {orden.estatus}"

    # Registrar en historial (con orden_id ficticio para mantener registro)
    historial = OrdenHistorial(
        orden_id=orden_id,
        campo="orden",
        valor_anterior=info_orden,
        valor_nuevo="ELIMINADA",
        usuario_id=current_user.id if current_user else None,
        usuario_nombre=current_user.username if current_user else None,
        accion="DELETE"
    )
    db.add(historial)

    # Eliminar entregas y orden
    db.query(EntregaParcial).filter(EntregaParcial.orden_id == orden_id).delete()
    db.delete(orden)
    db.commit()

    return {"message": f"Orden {orden_id} eliminada correctamente"}


# ============ Entregas Parciales ============

@router.get("/{orden_id}/entregas", response_model=List[EntregaParcialResponse])
async def list_entregas(
    orden_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar entregas parciales de una orden"""
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    entregas = db.query(EntregaParcial).filter(
        EntregaParcial.orden_id == orden_id
    ).order_by(EntregaParcial.numero_entrega).all()

    return entregas


@router.post("/{orden_id}/entregas", response_model=EntregaParcialResponse)
async def create_entrega(
    orden_id: str,
    entrega: EntregaParcialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Agregar entrega parcial a una orden"""
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    new_entrega = EntregaParcial(
        orden_id=orden_id,
        numero_entrega=entrega.numero_entrega,
        cantidad=entrega.cantidad,
        contra_recibo=entrega.contra_recibo,
        factura=entrega.factura,
        fecha_pago=entrega.fecha_pago,
        estatus=entrega.estatus,
        fecha_entrega=entrega.fecha_entrega,
        costo=entrega.costo,
        notas=entrega.notas
    )
    db.add(new_entrega)
    db.commit()
    db.refresh(new_entrega)

    return new_entrega


@router.put("/entregas/{entrega_id}", response_model=EntregaParcialResponse)
async def update_entrega(
    entrega_id: int,
    entrega_data: EntregaParcialUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar entrega parcial"""
    entrega = db.query(EntregaParcial).filter(EntregaParcial.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")

    update_data = entrega_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entrega, field, value)

    db.commit()
    db.refresh(entrega)

    return entrega


@router.delete("/entregas/{entrega_id}")
async def delete_entrega(
    entrega_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Eliminar entrega parcial"""
    entrega = db.query(EntregaParcial).filter(EntregaParcial.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")

    db.delete(entrega)
    db.commit()
    return {"message": "Entrega eliminada"}


# ============ Historial de Auditoría ============

@router.get("/historial/{orden_id}", response_model=List[HistorialResponse])
async def get_historial_orden(
    orden_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener historial de cambios de una orden"""
    historial = db.query(OrdenHistorial).filter(
        OrdenHistorial.orden_id == orden_id
    ).order_by(OrdenHistorial.fecha.desc()).all()

    return historial


@router.get("/historial/", response_model=List[HistorialResponse])
async def get_historial_all(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Obtener historial de todas las órdenes (admin)"""
    historial = db.query(OrdenHistorial).order_by(
        OrdenHistorial.fecha.desc()
    ).limit(limit).all()

    return historial


# ============ Import from Excel ============

@router.post("/import-batch", response_model=OrdenImportResult)
async def import_ordenes_batch(
    data: List[dict],
    auto_create_products: bool = Query(False, description="Crear productos automáticamente si no existen"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Importar órdenes desde datos procesados en frontend"""
    ordenes_creadas = 0
    ordenes_actualizadas = 0
    entregas_creadas = 0
    productos_creados = 0
    errores = 0
    detalles = []

    # Obtener proveedores para mapeo por nombre
    proveedores = {p.nombre.upper(): p.id for p in db.query(Proveedor).all()}

    for row in data:
        try:
            orden_id = str(row.get('oc', '')).strip()
            if not orden_id:
                continue

            producto_id = str(row.get('item', '')).strip()
            if not producto_id:
                errores += 1
                detalles.append(f"Orden {orden_id}: Falta producto_id")
                continue

            # Verificar producto existe
            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                if auto_create_products:
                    # Auto-crear producto
                    nombre_producto = row.get('nombre_producto') or producto_id
                    tipo_material = row.get('tipo_material') or 'TARJETAS'

                    # Buscar proveedor para el producto
                    proveedor_nombre = str(row.get('proveedor', '')).strip().upper()
                    prov_id = proveedores.get(proveedor_nombre, 1)  # Default a primer proveedor

                    nuevo_producto = Producto(
                        id=producto_id,
                        nombre=nombre_producto,
                        tipo=tipo_material,
                        proveedor_id=prov_id,
                        activo=True
                    )
                    db.add(nuevo_producto)
                    db.flush()
                    productos_creados += 1
                    detalles.append(f"Producto {producto_id} creado automáticamente")
                else:
                    errores += 1
                    detalles.append(f"Orden {orden_id}: Producto {producto_id} no encontrado")
                    continue

            # Buscar proveedor por nombre
            proveedor_nombre = str(row.get('proveedor', '')).strip().upper()
            proveedor_id = proveedores.get(proveedor_nombre)
            if not proveedor_id:
                # Crear proveedor si no existe
                new_proveedor = Proveedor(nombre=row.get('proveedor', 'DESCONOCIDO'))
                db.add(new_proveedor)
                db.flush()
                proveedor_id = new_proveedor.id
                proveedores[proveedor_nombre] = proveedor_id

            # Buscar o crear orden
            orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()

            # Determinar estatus basado en validación
            validacion = str(row.get('validacion') or '').strip().upper()
            if 'PRODUCCI' in validacion or 'PRODUCCION' in validacion:
                estatus = 'EN PROCESO'
            elif 'COMPRA' in validacion:
                estatus = 'COMPRA'
            else:
                estatus = 'PENDIENTE'

            orden_data = {
                'producto_id': producto_id,
                'proveedor_id': proveedor_id,
                'requi': row.get('requi') or None,
                'provision': row.get('provision') or None,
                'validacion': row.get('validacion') or None,
                'tipo_material': row.get('tipo_material') or None,
                'presupuesto': row.get('presupuesto') or None,
                'caracteristica': row.get('caracteristica') or None,
                'nombre_producto': row.get('nombre_producto') or None,
                'cantidad': int(row.get('volumen_total', 0) or 0),
                'costo_unitario': float(row.get('precio_unitario', 0) or 0),
                'fecha_orden': parse_date(row.get('fecha_oc')),
                'estatus': estatus
            }

            # Calcular costo total
            if orden_data['cantidad'] and orden_data['costo_unitario']:
                orden_data['costo_total'] = orden_data['cantidad'] * orden_data['costo_unitario']

            if orden:
                for field, value in orden_data.items():
                    if value is not None:
                        setattr(orden, field, value)
                ordenes_actualizadas += 1
            else:
                orden = OrdenCompra(id=orden_id, **orden_data)
                db.add(orden)
                ordenes_creadas += 1

            db.flush()

            # Procesar entregas parciales
            entregas = row.get('entregas', [])
            for entrega_data in entregas:
                num = entrega_data.get('numero', 1)

                # Verificar si ya existe esta entrega
                existing = db.query(EntregaParcial).filter(
                    EntregaParcial.orden_id == orden_id,
                    EntregaParcial.numero_entrega == num
                ).first()

                if existing:
                    # Actualizar
                    for field in ['cantidad', 'contra_recibo', 'factura', 'estatus', 'costo']:
                        if field in entrega_data and entrega_data[field] is not None:
                            setattr(existing, field, entrega_data[field])
                    # Fechas requieren conversión
                    if 'fecha_pago' in entrega_data:
                        existing.fecha_pago = parse_date(entrega_data['fecha_pago'])
                    if 'fecha_entrega' in entrega_data:
                        existing.fecha_entrega = parse_date(entrega_data['fecha_entrega'])
                else:
                    # Crear nueva entrega
                    new_entrega = EntregaParcial(
                        orden_id=orden_id,
                        numero_entrega=num,
                        cantidad=entrega_data.get('cantidad', 0),
                        contra_recibo=entrega_data.get('contra_recibo') or None,
                        factura=entrega_data.get('factura') or None,
                        fecha_pago=parse_date(entrega_data.get('fecha_pago')),
                        estatus=entrega_data.get('estatus') or None,
                        fecha_entrega=parse_date(entrega_data.get('fecha_entrega')),
                        costo=float(entrega_data.get('costo') or 0) if entrega_data.get('costo') else None
                    )
                    db.add(new_entrega)
                    entregas_creadas += 1

        except Exception as e:
            errores += 1
            detalles.append(f"Error procesando fila: {str(e)}")

    db.commit()

    return OrdenImportResult(
        ordenes_creadas=ordenes_creadas,
        ordenes_actualizadas=ordenes_actualizadas,
        entregas_creadas=entregas_creadas,
        productos_creados=productos_creados,
        errores=errores,
        detalles=detalles[:20]  # Limitar detalles
    )


@router.get("/stats/resumen")
async def get_ordenes_stats(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener estadísticas de órdenes"""
    total = db.query(OrdenCompra).count()
    pendientes = db.query(OrdenCompra).filter(OrdenCompra.estatus == 'PENDIENTE').count()
    en_proceso = db.query(OrdenCompra).filter(OrdenCompra.estatus == 'EN PROCESO').count()
    completadas = db.query(OrdenCompra).filter(OrdenCompra.estatus.in_(['COMPLETADA', 'PAGADA'])).count()

    return {
        'total': total,
        'pendientes': pendientes,
        'en_proceso': en_proceso,
        'completadas': completadas
    }


# ============ Generación de PDF ============

class SolicitudPDFData(BaseModel):
    """Datos adicionales para generar el PDF de solicitud de compra"""
    solicitante: Optional[str] = None
    area: Optional[str] = None
    correo: Optional[str] = None
    extension: Optional[str] = None
    autorizador: Optional[str] = None
    clave_presupuestal: Optional[str] = None
    centro_costos: Optional[str] = None
    usuario_bien: Optional[str] = None
    area_usuario: Optional[str] = None
    razon_social: Optional[str] = "BANCO INVEX SA INSTITUCION DE BANCA MULTIPLE"
    area_uso: Optional[str] = None
    motivo_compra: Optional[str] = None
    es_compra_unica: Optional[bool] = False
    es_compra_regular: Optional[bool] = True
    unidad_medida: Optional[str] = "PZA"
    direccion_entrega: Optional[str] = "TSYS MX, Toluca EDOMEX"


@router.get("/{orden_id}/pdf")
async def generate_orden_pdf(
    orden_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Generar PDF de orden de compra con los datos existentes.
    Útil para descargar rápidamente una orden en formato PDF.
    """
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )

    # Obtener datos relacionados
    producto = db.query(Producto).filter(Producto.id == orden.producto_id).first()
    proveedor = db.query(Proveedor).filter(Proveedor.id == orden.proveedor_id).first()

    # Convertir orden a diccionario
    orden_data = {
        'id': orden.id,
        'producto_id': orden.producto_id,
        'nombre_producto': orden.nombre_producto or (producto.nombre if producto else ''),
        'cantidad': orden.cantidad,
        'costo_unitario': orden.costo_unitario,
        'costo_total': orden.costo_total,
        'fecha_orden': orden.fecha_orden,
        'fecha_entrega': orden.fecha_entrega,
        'presupuesto': orden.presupuesto,
        'tipo_material': orden.tipo_material,
        'caracteristica': orden.caracteristica,
        'estatus': orden.estatus,
    }

    producto_data = {
        'id': producto.id,
        'nombre': producto.nombre,
        'tipo': producto.tipo
    } if producto else None

    proveedor_data = {
        'id': proveedor.id,
        'nombre': proveedor.nombre
    } if proveedor else None

    # Generar PDF
    pdf_buffer = generate_solicitud_from_orden(orden_data, proveedor_data, producto_data)

    # Nombre del archivo
    filename = f"OC_{orden_id}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/{orden_id}/pdf")
async def generate_orden_pdf_custom(
    orden_id: str,
    extra_data: SolicitudPDFData,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Generar PDF de orden de compra con datos adicionales personalizados.
    Permite agregar información del solicitante, autorizador, etc.
    """
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )

    # Obtener datos relacionados
    producto = db.query(Producto).filter(Producto.id == orden.producto_id).first()
    proveedor = db.query(Proveedor).filter(Proveedor.id == orden.proveedor_id).first()

    # Combinar datos de la orden con datos extra
    orden_data = {
        'id': orden.id,
        'producto_id': orden.producto_id,
        'nombre_producto': orden.nombre_producto or (producto.nombre if producto else ''),
        'cantidad': orden.cantidad,
        'costo_unitario': orden.costo_unitario,
        'costo_total': orden.costo_total,
        'fecha_orden': orden.fecha_orden,
        'fecha_entrega': orden.fecha_entrega,
        'presupuesto': extra_data.clave_presupuestal or orden.presupuesto,
        'tipo_material': orden.tipo_material,
        'caracteristica': orden.caracteristica,
        'estatus': orden.estatus,
        # Datos adicionales del formulario
        'solicitante': extra_data.solicitante or current_user.nombre_completo or current_user.username,
        'area': extra_data.area,
        'correo': extra_data.correo or current_user.email,
        'extension': extra_data.extension,
        'autorizador': extra_data.autorizador,
        'centro_costos': extra_data.centro_costos,
        'usuario_bien': extra_data.usuario_bien,
        'area_usuario': extra_data.area_usuario,
        'razon_social': extra_data.razon_social,
        'area_uso': extra_data.area_uso,
        'motivo_compra': extra_data.motivo_compra or orden.nombre_producto,
        'es_compra_unica': extra_data.es_compra_unica,
        'es_compra_regular': extra_data.es_compra_regular,
        'unidad_medida': extra_data.unidad_medida,
        'direccion_entrega': extra_data.direccion_entrega,
    }

    producto_data = {
        'id': producto.id,
        'nombre': producto.nombre,
        'tipo': producto.tipo
    } if producto else None

    proveedor_data = {
        'id': proveedor.id,
        'nombre': proveedor.nombre
    } if proveedor else None

    # Generar PDF
    pdf_buffer = generate_solicitud_from_orden(orden_data, proveedor_data, producto_data)

    # Nombre del archivo
    filename = f"OC_{orden_id}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
