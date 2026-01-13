from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import io

from ..database import get_db
from ..models import ProcesoBAU, ProcesoBAUHistorial, Presupuesto, Producto, Usuario
from ..schemas.proceso_bau import (
    PresupuestoCreate, PresupuestoUpdate, PresupuestoResponse,
    ProcesoBAUCreate, ProcesoBAUUpdate, ProcesoBAUResponse,
    ProcesoBAUHistorialResponse, ProcesoBAUImportResult
)
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/procesos-bau", tags=["Procesos BAU"])


# ============ Presupuestos Endpoints ============

@router.get("/presupuestos", response_model=List[PresupuestoResponse])
async def list_presupuestos(
    activos_only: bool = Query(True, description="Solo mostrar presupuestos activos"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar presupuestos"""
    query = db.query(Presupuesto)
    if activos_only:
        query = query.filter(Presupuesto.activo == True)
    return query.order_by(Presupuesto.codigo).all()


@router.post("/presupuestos", response_model=PresupuestoResponse, status_code=status.HTTP_201_CREATED)
async def create_presupuesto(
    data: PresupuestoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear presupuesto (solo admin)"""
    existing = db.query(Presupuesto).filter(Presupuesto.codigo == data.codigo).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El presupuesto con código '{data.codigo}' ya existe"
        )

    presupuesto = Presupuesto(**data.model_dump())
    db.add(presupuesto)
    db.commit()
    db.refresh(presupuesto)
    return presupuesto


@router.put("/presupuestos/{presupuesto_id}", response_model=PresupuestoResponse)
async def update_presupuesto(
    presupuesto_id: int,
    data: PresupuestoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar presupuesto (solo admin)"""
    presupuesto = db.query(Presupuesto).filter(Presupuesto.id == presupuesto_id).first()
    if not presupuesto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(presupuesto, field, value)

    db.commit()
    db.refresh(presupuesto)
    return presupuesto


@router.delete("/presupuestos/{presupuesto_id}")
async def delete_presupuesto(
    presupuesto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Desactivar presupuesto (solo admin)"""
    presupuesto = db.query(Presupuesto).filter(Presupuesto.id == presupuesto_id).first()
    if not presupuesto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")

    presupuesto.activo = False
    db.commit()
    return {"message": f"Presupuesto '{presupuesto.codigo}' desactivado"}


# ============ Procesos BAU Endpoints ============

@router.get("/", response_model=List[ProcesoBAUResponse])
async def list_procesos(
    tipo_proceso: Optional[str] = None,
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    producto_id: Optional[str] = None,
    presupuesto_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar procesos BAU con filtros opcionales"""
    query = db.query(ProcesoBAU)

    if tipo_proceso:
        query = query.filter(ProcesoBAU.tipo_proceso == tipo_proceso)
    if mes:
        query = query.filter(ProcesoBAU.mes == mes)
    if anio:
        query = query.filter(ProcesoBAU.anio == anio)
    if producto_id:
        query = query.filter(ProcesoBAU.producto_id == producto_id)
    if presupuesto_id:
        query = query.filter(ProcesoBAU.presupuesto_id == presupuesto_id)

    procesos = query.order_by(ProcesoBAU.anio.desc(), ProcesoBAU.mes.desc()).all()

    result = []
    for p in procesos:
        producto = db.query(Producto).filter(Producto.id == p.producto_id).first()
        presupuesto = db.query(Presupuesto).filter(Presupuesto.id == p.presupuesto_id).first() if p.presupuesto_id else None
        usuario = db.query(Usuario).filter(Usuario.id == p.usuario_id).first() if p.usuario_id else None
        result.append({
            **p.__dict__,
            "producto_nombre": producto.nombre if producto else None,
            "presupuesto_codigo": presupuesto.codigo if presupuesto else None,
            "usuario_nombre": usuario.nombre if usuario else None
        })
    return result


@router.get("/{proceso_id}", response_model=ProcesoBAUResponse)
async def get_proceso(
    proceso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener proceso BAU por ID"""
    proceso = db.query(ProcesoBAU).filter(ProcesoBAU.id == proceso_id).first()
    if not proceso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proceso no encontrado")

    producto = db.query(Producto).filter(Producto.id == proceso.producto_id).first()
    presupuesto = db.query(Presupuesto).filter(Presupuesto.id == proceso.presupuesto_id).first() if proceso.presupuesto_id else None
    usuario = db.query(Usuario).filter(Usuario.id == proceso.usuario_id).first() if proceso.usuario_id else None

    return {
        **proceso.__dict__,
        "producto_nombre": producto.nombre if producto else None,
        "presupuesto_codigo": presupuesto.codigo if presupuesto else None,
        "usuario_nombre": usuario.nombre if usuario else None
    }


@router.post("/", response_model=ProcesoBAUResponse, status_code=status.HTTP_201_CREATED)
async def create_proceso(
    data: ProcesoBAUCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear proceso BAU (solo admin)"""
    # Verificar producto existe
    producto = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Producto no encontrado")

    # Verificar presupuesto existe
    presupuesto = None
    if data.presupuesto_id:
        presupuesto = db.query(Presupuesto).filter(Presupuesto.id == data.presupuesto_id).first()
        if not presupuesto:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Presupuesto no encontrado")

    # Verificar duplicado
    existing = db.query(ProcesoBAU).filter(
        ProcesoBAU.producto_id == data.producto_id,
        ProcesoBAU.tipo_proceso == data.tipo_proceso,
        ProcesoBAU.mes == data.mes,
        ProcesoBAU.anio == data.anio
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un registro de {data.tipo_proceso} para {data.producto_id} en {data.mes}/{data.anio}"
        )

    proceso = ProcesoBAU(
        **data.model_dump(),
        usuario_id=current_user.id
    )
    db.add(proceso)
    db.commit()
    db.refresh(proceso)

    return {
        **proceso.__dict__,
        "producto_nombre": producto.nombre,
        "presupuesto_codigo": presupuesto.codigo if presupuesto else None,
        "usuario_nombre": current_user.nombre
    }


@router.put("/{proceso_id}", response_model=ProcesoBAUResponse)
async def update_proceso(
    proceso_id: int,
    data: ProcesoBAUUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar proceso BAU (solo admin) - registra historial de cambios"""
    proceso = db.query(ProcesoBAU).filter(ProcesoBAU.id == proceso_id).first()
    if not proceso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proceso no encontrado")

    # Registrar historial si cambia cantidad
    if data.cantidad is not None and data.cantidad != proceso.cantidad:
        client_ip = request.client.host if request.client else None
        historial = ProcesoBAUHistorial(
            proceso_id=proceso_id,
            cantidad_anterior=proceso.cantidad,
            cantidad_nueva=data.cantidad,
            usuario_id=current_user.id,
            ip_address=client_ip
        )
        db.add(historial)

    # Actualizar campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proceso, field, value)

    db.commit()
    db.refresh(proceso)

    producto = db.query(Producto).filter(Producto.id == proceso.producto_id).first()
    presupuesto = db.query(Presupuesto).filter(Presupuesto.id == proceso.presupuesto_id).first() if proceso.presupuesto_id else None
    usuario = db.query(Usuario).filter(Usuario.id == proceso.usuario_id).first() if proceso.usuario_id else None

    return {
        **proceso.__dict__,
        "producto_nombre": producto.nombre if producto else None,
        "presupuesto_codigo": presupuesto.codigo if presupuesto else None,
        "usuario_nombre": usuario.nombre if usuario else None
    }


@router.delete("/{proceso_id}")
async def delete_proceso(
    proceso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Eliminar proceso BAU (solo admin)"""
    proceso = db.query(ProcesoBAU).filter(ProcesoBAU.id == proceso_id).first()
    if not proceso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proceso no encontrado")

    # Eliminar historial primero
    db.query(ProcesoBAUHistorial).filter(ProcesoBAUHistorial.proceso_id == proceso_id).delete()
    db.delete(proceso)
    db.commit()

    return {"message": "Proceso eliminado exitosamente"}


# ============ Historial Endpoints ============

@router.get("/historial/{proceso_id}", response_model=List[ProcesoBAUHistorialResponse])
async def get_historial(
    proceso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener historial de cambios de un proceso"""
    historial = db.query(ProcesoBAUHistorial).filter(
        ProcesoBAUHistorial.proceso_id == proceso_id
    ).order_by(ProcesoBAUHistorial.fecha.desc()).all()

    result = []
    for h in historial:
        usuario = db.query(Usuario).filter(Usuario.id == h.usuario_id).first() if h.usuario_id else None
        result.append({
            **h.__dict__,
            "usuario_nombre": usuario.nombre if usuario else None
        })
    return result


# ============ Excel Import Endpoint ============

@router.post("/upload-excel", response_model=ProcesoBAUImportResult)
async def upload_excel(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Importar procesos BAU desde archivo Excel"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser formato Excel (.xlsx o .xls)"
        )

    try:
        import openpyxl

        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        sheet = workbook.active

        creados = 0
        actualizados = 0
        errores = 0
        mensajes = []

        # Leer encabezados (primera fila)
        headers = [cell.value for cell in sheet[1]]

        # Mapeo de columnas esperadas
        col_map = {}
        for idx, header in enumerate(headers):
            if header:
                header_lower = str(header).lower().strip()
                if 'producto' in header_lower or 'item' in header_lower:
                    col_map['producto_id'] = idx
                elif 'mes' in header_lower:
                    col_map['mes'] = idx
                elif header_lower in ['año', 'anio', 'ano', 'year']:
                    col_map['anio'] = idx
                elif 'trasco' in header_lower or 'trascodificacion' in header_lower:
                    col_map['trascodificacion'] = idx
                elif 'btb' in header_lower or 'bank to bank' in header_lower:
                    col_map['btb'] = idx
                elif 'renov' in header_lower or 'anticipada' in header_lower:
                    col_map['renovacion_anticipada'] = idx
                elif 'presupuesto' in header_lower:
                    col_map['presupuesto'] = idx

        # Procesar filas
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                producto_id = row[col_map.get('producto_id', 0)] if col_map.get('producto_id') is not None else None
                if not producto_id:
                    continue  # Saltar filas vacías

                producto_id = str(producto_id).strip()

                # Verificar producto existe
                producto = db.query(Producto).filter(Producto.id == producto_id).first()
                if not producto:
                    mensajes.append(f"Fila {row_idx}: Producto '{producto_id}' no encontrado")
                    errores += 1
                    continue

                mes = int(row[col_map.get('mes', 1)]) if col_map.get('mes') is not None else None
                anio = int(row[col_map.get('anio', 2)]) if col_map.get('anio') is not None else None

                if not mes or not anio:
                    mensajes.append(f"Fila {row_idx}: Mes o año no especificado")
                    errores += 1
                    continue

                # Buscar presupuesto
                presupuesto_id = None
                if col_map.get('presupuesto') is not None:
                    presupuesto_codigo = row[col_map['presupuesto']]
                    if presupuesto_codigo:
                        presupuesto = db.query(Presupuesto).filter(
                            Presupuesto.codigo == str(presupuesto_codigo).strip()
                        ).first()
                        if presupuesto:
                            presupuesto_id = presupuesto.id

                # Procesar cada tipo de proceso
                tipos_procesos = [
                    ('trascodificacion', col_map.get('trascodificacion')),
                    ('btb', col_map.get('btb')),
                    ('renovacion_anticipada', col_map.get('renovacion_anticipada'))
                ]

                for tipo, col_idx in tipos_procesos:
                    if col_idx is None:
                        continue

                    cantidad = row[col_idx]
                    if cantidad is None or cantidad == '':
                        continue

                    try:
                        cantidad = int(cantidad)
                    except (ValueError, TypeError):
                        continue

                    # Buscar si existe
                    existing = db.query(ProcesoBAU).filter(
                        ProcesoBAU.producto_id == producto_id,
                        ProcesoBAU.tipo_proceso == tipo,
                        ProcesoBAU.mes == mes,
                        ProcesoBAU.anio == anio
                    ).first()

                    if existing:
                        if existing.cantidad != cantidad:
                            # Registrar historial
                            historial = ProcesoBAUHistorial(
                                proceso_id=existing.id,
                                cantidad_anterior=existing.cantidad,
                                cantidad_nueva=cantidad,
                                usuario_id=current_user.id,
                                ip_address=request.client.host if request and request.client else None
                            )
                            db.add(historial)
                            existing.cantidad = cantidad
                            existing.presupuesto_id = presupuesto_id
                            actualizados += 1
                    else:
                        nuevo = ProcesoBAU(
                            producto_id=producto_id,
                            tipo_proceso=tipo,
                            mes=mes,
                            anio=anio,
                            cantidad=cantidad,
                            presupuesto_id=presupuesto_id,
                            usuario_id=current_user.id
                        )
                        db.add(nuevo)
                        creados += 1

            except Exception as e:
                mensajes.append(f"Fila {row_idx}: Error - {str(e)}")
                errores += 1

        db.commit()

        return ProcesoBAUImportResult(
            creados=creados,
            actualizados=actualizados,
            errores=errores,
            mensajes=mensajes
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error procesando archivo: {str(e)}"
        )


@router.post("/upload-batch", response_model=ProcesoBAUImportResult)
async def upload_batch(
    data: List[dict],
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Importar procesos BAU desde datos procesados en frontend"""
    creados = 0
    actualizados = 0
    errores = 0
    mensajes = []

    # Cache de presupuestos por código
    presupuestos_cache = {}

    for idx, item in enumerate(data):
        try:
            producto_id = item.get('producto_id')
            tipo_proceso = item.get('tipo_proceso')
            mes = item.get('mes')
            anio = item.get('anio')
            cantidad = item.get('cantidad', 0)
            presupuesto_codigo = item.get('presupuesto_codigo')

            if not producto_id or not tipo_proceso or not mes or not anio:
                mensajes.append(f"Registro {idx + 1}: Datos incompletos")
                errores += 1
                continue

            # Verificar producto existe
            producto = db.query(Producto).filter(Producto.id == producto_id).first()
            if not producto:
                mensajes.append(f"Registro {idx + 1}: Producto '{producto_id}' no encontrado")
                errores += 1
                continue

            # Buscar presupuesto por código
            presupuesto_id = None
            if presupuesto_codigo:
                if presupuesto_codigo not in presupuestos_cache:
                    presupuesto = db.query(Presupuesto).filter(
                        Presupuesto.codigo == presupuesto_codigo,
                        Presupuesto.activo == True
                    ).first()
                    presupuestos_cache[presupuesto_codigo] = presupuesto.id if presupuesto else None

                presupuesto_id = presupuestos_cache[presupuesto_codigo]

            # Buscar si existe
            existing = db.query(ProcesoBAU).filter(
                ProcesoBAU.producto_id == producto_id,
                ProcesoBAU.tipo_proceso == tipo_proceso,
                ProcesoBAU.mes == mes,
                ProcesoBAU.anio == anio
            ).first()

            if existing:
                if existing.cantidad != cantidad:
                    # Registrar historial
                    historial = ProcesoBAUHistorial(
                        proceso_id=existing.id,
                        cantidad_anterior=existing.cantidad,
                        cantidad_nueva=cantidad,
                        usuario_id=current_user.id,
                        ip_address=request.client.host if request.client else None
                    )
                    db.add(historial)
                    existing.cantidad = cantidad
                    if presupuesto_id:
                        existing.presupuesto_id = presupuesto_id
                    actualizados += 1
            else:
                nuevo = ProcesoBAU(
                    producto_id=producto_id,
                    tipo_proceso=tipo_proceso,
                    mes=mes,
                    anio=anio,
                    cantidad=cantidad,
                    presupuesto_id=presupuesto_id,
                    usuario_id=current_user.id
                )
                db.add(nuevo)
                creados += 1

        except Exception as e:
            mensajes.append(f"Registro {idx + 1}: Error - {str(e)}")
            errores += 1

    db.commit()

    return ProcesoBAUImportResult(
        creados=creados,
        actualizados=actualizados,
        errores=errores,
        mensajes=mensajes
    )
