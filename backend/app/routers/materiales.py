from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, timedelta

from ..database import get_db
from ..models import (
    InventarioMaterial, RelacionProductoMaterial, MovimientoMaterial,
    Usuario, Producto, Inventario
)
from ..schemas.material import (
    MaterialCreate, MaterialUpdate, MaterialResponse,
    RelacionProductoMaterialCreate, RelacionProductoMaterialResponse,
    MovimientoMaterialCreate, MovimientoMaterialResponse,
    AlertaMaterial, ReporteDiferencias, ResumenInventarioMateriales
)
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/materiales", tags=["Inventario de Materiales"])

# Constante: límite de plástico vs materiales
LIMITE_PORCENTAJE_PLASTICO = 1.0  # 1%


# ==================== Alertas y Reportes (ANTES de rutas dinámicas) ====================

@router.get("/alertas", response_model=List[AlertaMaterial])
async def get_alertas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener alertas activas del inventario de materiales"""
    alertas = []

    # 1. Verificar regla del 1%: plásticos vs materiales
    productos = db.query(Producto).all()

    for producto in productos:
        # Obtener inventario de plásticos
        inv = db.query(Inventario).filter(Inventario.producto_id == producto.id).first()
        if not inv:
            continue

        total_plasticos = (inv.boveda_trabajo or 0) + (inv.boveda_principal or 0)

        # Obtener materiales relacionados
        relaciones = db.query(RelacionProductoMaterial).filter(
            RelacionProductoMaterial.producto_id == producto.id
        ).all()

        total_materiales = 0
        for r in relaciones:
            material = db.query(InventarioMaterial).filter(
                InventarioMaterial.num_parte == r.material_num_parte
            ).first()
            if material:
                total_materiales += material.total_inventario

        if total_materiales > 0:
            porcentaje = (total_plasticos / total_materiales) * 100
            if porcentaje > LIMITE_PORCENTAJE_PLASTICO:
                alertas.append(AlertaMaterial(
                    tipo="exceso_plastico",
                    mensaje=f"Producto {producto.id}: Plásticos ({total_plasticos:,}) exceden 1% de materiales ({total_materiales:,}). Actual: {porcentaje:.2f}%",
                    severidad="alta",
                    producto_id=producto.id,
                    valor_actual=porcentaje,
                    valor_limite=LIMITE_PORCENTAJE_PLASTICO
                ))

    # 2. Materiales sin movimiento > 90 días
    materiales = db.query(InventarioMaterial).filter(InventarioMaterial.activo == 1).all()

    for m in materiales:
        if m.dias_sin_movimiento and m.dias_sin_movimiento > 90:
            alertas.append(AlertaMaterial(
                tipo="sin_movimiento",
                mensaje=f"Material {m.num_parte} sin movimiento por {m.dias_sin_movimiento} días",
                severidad="media" if m.dias_sin_movimiento < 180 else "alta",
                material_num_parte=m.num_parte,
                valor_actual=m.dias_sin_movimiento,
                valor_limite=90
            ))

    # 3. Stock bajo (menos de 1000 unidades para materiales con movimiento reciente)
    for m in materiales:
        if m.total_inventario < 1000 and m.total_inventario > 0:
            if m.dias_sin_movimiento and m.dias_sin_movimiento < 30:
                alertas.append(AlertaMaterial(
                    tipo="bajo_stock",
                    mensaje=f"Material {m.num_parte} con stock bajo: {m.total_inventario:,} unidades",
                    severidad="media",
                    material_num_parte=m.num_parte,
                    valor_actual=m.total_inventario,
                    valor_limite=1000
                ))

    return alertas


@router.get("/diferencias", response_model=List[ReporteDiferencias])
async def get_reporte_diferencias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener reporte de diferencias plásticos vs materiales por producto"""
    productos = db.query(Producto).all()
    reportes = []

    for producto in productos:
        inv = db.query(Inventario).filter(Inventario.producto_id == producto.id).first()
        if not inv:
            continue

        total_plasticos = (inv.boveda_trabajo or 0) + (inv.boveda_principal or 0)

        relaciones = db.query(RelacionProductoMaterial).filter(
            RelacionProductoMaterial.producto_id == producto.id
        ).all()

        materiales_detalle = []
        total_materiales = 0

        for r in relaciones:
            material = db.query(InventarioMaterial).filter(
                InventarioMaterial.num_parte == r.material_num_parte
            ).first()
            if material:
                total_materiales += material.total_inventario
                materiales_detalle.append({
                    "num_parte": material.num_parte,
                    "descripcion": material.descripcion,
                    "tipo": r.tipo_material,
                    "cantidad": material.total_inventario
                })

        if total_materiales > 0:
            porcentaje = (total_plasticos / total_materiales) * 100
        else:
            porcentaje = 0

        reportes.append(ReporteDiferencias(
            producto_id=producto.id,
            producto_nombre=producto.nombre,
            total_plasticos=total_plasticos,
            total_materiales=total_materiales,
            porcentaje_plasticos=round(porcentaje, 4),
            excede_limite=porcentaje > LIMITE_PORCENTAJE_PLASTICO,
            materiales_detalle=materiales_detalle
        ))

    return reportes


@router.get("/capacidad-ensamble")
async def get_capacidad_ensamble(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Calcular capacidad de ensamble de kits completos por producto.
    Para ensamblar 1 kit se necesita: 1 plástico + 1 de cada material relacionado.
    La capacidad está limitada por el componente con menor stock (cuello de botella).
    Incluye análisis de TODOS los materiales faltantes y materiales compartidos.
    """
    productos = db.query(Producto).all()
    resultado = []

    # Primero, crear un mapa de materiales compartidos
    materiales_compartidos = {}
    for producto in productos:
        relaciones = db.query(RelacionProductoMaterial).filter(
            RelacionProductoMaterial.producto_id == producto.id
        ).all()
        for r in relaciones:
            if r.material_num_parte not in materiales_compartidos:
                materiales_compartidos[r.material_num_parte] = []
            materiales_compartidos[r.material_num_parte].append(producto.id)

    for producto in productos:
        # Obtener inventario de plásticos
        inv = db.query(Inventario).filter(Inventario.producto_id == producto.id).first()
        if not inv:
            continue

        total_plasticos = (inv.boveda_trabajo or 0) + (inv.boveda_principal or 0)

        # Obtener materiales relacionados
        relaciones = db.query(RelacionProductoMaterial).filter(
            RelacionProductoMaterial.producto_id == producto.id
        ).all()

        if not relaciones:
            resultado.append({
                "producto_id": producto.id,
                "producto_nombre": producto.nombre,
                "plasticos_disponibles": total_plasticos,
                "componentes": [],
                "capacidad_ensamble": 0,
                "material_limitante": None,
                "tipo_limitante": None,
                "excedente_plasticos": total_plasticos,
                "puede_ensamblar": False,
                "alerta": "Sin materiales configurados",
                "materiales_faltantes": [],
                "tiene_materiales_compartidos": False
            })
            continue

        # Obtener detalle de cada material
        componentes = []
        cantidades_materiales = []
        materiales_faltantes = []

        for r in relaciones:
            material = db.query(InventarioMaterial).filter(
                InventarioMaterial.num_parte == r.material_num_parte
            ).first()
            if material:
                cantidad = material.total_inventario

                # Verificar si el material es compartido con otros productos
                productos_compartidos = materiales_compartidos.get(r.material_num_parte, [])
                es_compartido = len(productos_compartidos) > 1
                otros_productos = [p for p in productos_compartidos if p != producto.id]

                componentes.append({
                    "num_parte": material.num_parte,
                    "descripcion": material.descripcion,
                    "tipo": r.tipo_material,
                    "cantidad_disponible": cantidad,
                    "es_limitante": False,
                    "faltante": 0,
                    "es_compartido": es_compartido,
                    "productos_compartidos": otros_productos
                })
                cantidades_materiales.append({
                    "cantidad": cantidad,
                    "num_parte": material.num_parte,
                    "tipo": r.tipo_material,
                    "descripcion": material.descripcion
                })

        # Calcular capacidad de ensamble
        if cantidades_materiales:
            min_material = min(cantidades_materiales, key=lambda x: x["cantidad"])
            capacidad_por_materiales = min_material["cantidad"]

            if total_plasticos <= capacidad_por_materiales:
                capacidad_ensamble = total_plasticos
                material_limitante = "Plásticos"
                tipo_limitante = "plastico"
            else:
                capacidad_ensamble = capacidad_por_materiales
                material_limitante = min_material["num_parte"]
                tipo_limitante = min_material["tipo"]

            # Calcular faltantes para TODOS los materiales (no solo el limitante)
            for comp in componentes:
                faltante = total_plasticos - comp["cantidad_disponible"]
                if faltante > 0:
                    comp["faltante"] = faltante
                    comp["es_limitante"] = True
                    materiales_faltantes.append({
                        "num_parte": comp["num_parte"],
                        "tipo": comp["tipo"],
                        "descripcion": comp["descripcion"],
                        "disponible": comp["cantidad_disponible"],
                        "necesario": total_plasticos,
                        "faltante": faltante,
                        "es_compartido": comp["es_compartido"],
                        "productos_compartidos": comp["productos_compartidos"]
                    })
                else:
                    comp["faltante"] = 0

            # Ordenar faltantes por cantidad (mayor faltante primero)
            materiales_faltantes.sort(key=lambda x: x["faltante"], reverse=True)

            excedente_plasticos = total_plasticos - capacidad_ensamble

            # Verificar si tiene materiales compartidos
            tiene_compartidos = any(comp["es_compartido"] for comp in componentes)

            # Determinar alerta
            if len(materiales_faltantes) > 0:
                if len(materiales_faltantes) == 1:
                    alerta = f"Falta {materiales_faltantes[0]['faltante']:,} unidades de {materiales_faltantes[0]['num_parte']}"
                else:
                    alerta = f"Faltan materiales: {len(materiales_faltantes)} componentes insuficientes"
            elif excedente_plasticos < 0:
                alerta = f"Hay materiales suficientes para {abs(excedente_plasticos):,} kits adicionales"
            else:
                alerta = "Inventario balanceado"

            resultado.append({
                "producto_id": producto.id,
                "producto_nombre": producto.nombre,
                "plasticos_disponibles": total_plasticos,
                "componentes": componentes,
                "capacidad_ensamble": capacidad_ensamble,
                "material_limitante": material_limitante,
                "tipo_limitante": tipo_limitante,
                "excedente_plasticos": excedente_plasticos,
                "puede_ensamblar": capacidad_ensamble > 0,
                "kits_posibles": capacidad_ensamble,
                "alerta": alerta,
                "materiales_faltantes": materiales_faltantes,
                "tiene_materiales_compartidos": tiene_compartidos,
                "total_materiales_faltantes": len(materiales_faltantes)
            })
        else:
            resultado.append({
                "producto_id": producto.id,
                "producto_nombre": producto.nombre,
                "plasticos_disponibles": total_plasticos,
                "componentes": [],
                "capacidad_ensamble": 0,
                "material_limitante": None,
                "tipo_limitante": None,
                "excedente_plasticos": total_plasticos,
                "puede_ensamblar": False,
                "alerta": "Sin materiales disponibles",
                "materiales_faltantes": [],
                "tiene_materiales_compartidos": False,
                "total_materiales_faltantes": 0
            })

    return resultado


@router.get("/resumen", response_model=ResumenInventarioMateriales)
async def get_resumen_materiales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener resumen del inventario de materiales"""
    materiales_db = db.query(InventarioMaterial).filter(InventarioMaterial.activo == 1).all()

    total_items = sum(m.total_inventario for m in materiales_db)

    sin_mov_30 = sum(1 for m in materiales_db if m.dias_sin_movimiento and m.dias_sin_movimiento > 30)
    sin_mov_90 = sum(1 for m in materiales_db if m.dias_sin_movimiento and m.dias_sin_movimiento > 90)

    # Contar alertas activas
    alertas = await get_alertas(db, current_user)

    return {
        "total_materiales": len(materiales_db),
        "total_items": total_items,
        "materiales_sin_movimiento_30_dias": sin_mov_30,
        "materiales_sin_movimiento_90_dias": sin_mov_90,
        "alertas_activas": len(alertas)
    }


# ==================== CRUD Materiales ====================

@router.get("/", response_model=List[MaterialResponse])
async def list_materiales(
    activos_only: bool = True,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todos los materiales"""
    query = db.query(InventarioMaterial)
    if activos_only:
        query = query.filter(InventarioMaterial.activo == 1)

    materiales = query.order_by(InventarioMaterial.num_parte).all()

    result = []
    for m in materiales:
        # Obtener productos relacionados
        relaciones = db.query(RelacionProductoMaterial).filter(
            RelacionProductoMaterial.material_num_parte == m.num_parte
        ).all()
        productos = [r.producto_id for r in relaciones]

        result.append({
            "num_parte": m.num_parte,
            "descripcion": m.descripcion,
            "cantidad_recibida": m.cantidad_recibida,
            "fecha_ultimo_ingreso": m.fecha_ultimo_ingreso,
            "saldo_actual": m.saldo_actual,
            "fecha_ultimo_movimiento": m.fecha_ultimo_movimiento,
            "total_almacen_general": m.total_almacen_general,
            "total_piso_produccion": m.total_piso_produccion,
            "total_inventario": m.total_inventario,
            "dias_sin_movimiento": m.dias_sin_movimiento,
            "activo": m.activo,
            "productos_relacionados": productos
        })

    return result


@router.get("/{num_parte}", response_model=MaterialResponse)
async def get_material(
    num_parte: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener detalle de un material"""
    material = db.query(InventarioMaterial).filter(
        InventarioMaterial.num_parte == num_parte
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material no encontrado"
        )

    relaciones = db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.material_num_parte == num_parte
    ).all()
    productos = [r.producto_id for r in relaciones]

    return {
        "num_parte": material.num_parte,
        "descripcion": material.descripcion,
        "cantidad_recibida": material.cantidad_recibida,
        "fecha_ultimo_ingreso": material.fecha_ultimo_ingreso,
        "saldo_actual": material.saldo_actual,
        "fecha_ultimo_movimiento": material.fecha_ultimo_movimiento,
        "total_almacen_general": material.total_almacen_general,
        "total_piso_produccion": material.total_piso_produccion,
        "total_inventario": material.total_inventario,
        "dias_sin_movimiento": material.dias_sin_movimiento,
        "activo": material.activo,
        "productos_relacionados": productos
    }


@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "tsys"]))
):
    """Crear nuevo material"""
    existing = db.query(InventarioMaterial).filter(
        InventarioMaterial.num_parte == material.num_parte
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un material con ese número de parte"
        )

    new_material = InventarioMaterial(**material.model_dump())
    db.add(new_material)
    db.commit()
    db.refresh(new_material)

    return {
        **material.model_dump(),
        "total_inventario": new_material.total_inventario,
        "dias_sin_movimiento": new_material.dias_sin_movimiento,
        "activo": 1,
        "productos_relacionados": []
    }


@router.put("/{num_parte}", response_model=MaterialResponse)
async def update_material(
    num_parte: str,
    material_update: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "tsys"]))
):
    """Actualizar material"""
    material = db.query(InventarioMaterial).filter(
        InventarioMaterial.num_parte == num_parte
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material no encontrado"
        )

    update_data = material_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)

    db.commit()
    db.refresh(material)

    relaciones = db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.material_num_parte == num_parte
    ).all()
    productos = [r.producto_id for r in relaciones]

    return {
        "num_parte": material.num_parte,
        "descripcion": material.descripcion,
        "cantidad_recibida": material.cantidad_recibida,
        "fecha_ultimo_ingreso": material.fecha_ultimo_ingreso,
        "saldo_actual": material.saldo_actual,
        "fecha_ultimo_movimiento": material.fecha_ultimo_movimiento,
        "total_almacen_general": material.total_almacen_general,
        "total_piso_produccion": material.total_piso_produccion,
        "total_inventario": material.total_inventario,
        "dias_sin_movimiento": material.dias_sin_movimiento,
        "activo": material.activo,
        "productos_relacionados": productos
    }


# ==================== Movimientos ====================

@router.post("/movimiento", response_model=MovimientoMaterialResponse)
async def registrar_movimiento(
    movimiento: MovimientoMaterialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin", "tsys"]))
):
    """Registrar entrada, salida o ajuste de material"""
    material = db.query(InventarioMaterial).filter(
        InventarioMaterial.num_parte == movimiento.material_num_parte
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material no encontrado"
        )

    cantidad_anterior = material.total_almacen_general

    if movimiento.tipo_movimiento == "entrada":
        material.total_almacen_general += movimiento.cantidad
        material.cantidad_recibida = movimiento.cantidad
        material.fecha_ultimo_ingreso = date.today()
    elif movimiento.tipo_movimiento == "salida":
        if material.total_almacen_general < movimiento.cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock insuficiente"
            )
        material.total_almacen_general -= movimiento.cantidad
    elif movimiento.tipo_movimiento == "ajuste":
        material.total_almacen_general = movimiento.cantidad
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de movimiento inválido"
        )

    material.saldo_actual = material.total_almacen_general
    material.fecha_ultimo_movimiento = date.today()

    # Crear registro de movimiento
    nuevo_mov = MovimientoMaterial(
        material_num_parte=movimiento.material_num_parte,
        tipo_movimiento=movimiento.tipo_movimiento,
        cantidad=movimiento.cantidad,
        cantidad_anterior=cantidad_anterior,
        cantidad_nueva=material.total_almacen_general,
        motivo=movimiento.motivo,
        usuario_id=current_user.id
    )

    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)

    return nuevo_mov


@router.get("/movimientos/{num_parte}", response_model=List[MovimientoMaterialResponse])
async def get_movimientos_material(
    num_parte: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener historial de movimientos de un material"""
    movimientos = db.query(MovimientoMaterial).filter(
        MovimientoMaterial.material_num_parte == num_parte
    ).order_by(MovimientoMaterial.fecha.desc()).limit(limit).all()

    return movimientos


# ==================== Relaciones Producto-Material ====================

@router.post("/relacion", response_model=RelacionProductoMaterialResponse)
async def crear_relacion(
    relacion: RelacionProductoMaterialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear relación entre producto y material"""
    # Verificar que existan
    producto = db.query(Producto).filter(Producto.id == relacion.producto_id).first()
    material = db.query(InventarioMaterial).filter(
        InventarioMaterial.num_parte == relacion.material_num_parte
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not material:
        raise HTTPException(status_code=404, detail="Material no encontrado")

    nueva_relacion = RelacionProductoMaterial(**relacion.model_dump())
    db.add(nueva_relacion)
    db.commit()
    db.refresh(nueva_relacion)

    return nueva_relacion


@router.get("/relaciones/{producto_id}")
async def get_materiales_producto(
    producto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener materiales relacionados a un producto"""
    relaciones = db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.producto_id == producto_id
    ).all()

    result = []
    for r in relaciones:
        material = db.query(InventarioMaterial).filter(
            InventarioMaterial.num_parte == r.material_num_parte
        ).first()
        if material:
            result.append({
                "relacion_id": r.id,
                "tipo_material": r.tipo_material,
                "num_parte": material.num_parte,
                "descripcion": material.descripcion,
                "total_inventario": material.total_inventario,
                "dias_sin_movimiento": material.dias_sin_movimiento
            })

    return result


@router.delete("/relacion/{relacion_id}")
async def eliminar_relacion(
    relacion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Eliminar relación entre producto y material"""
    relacion = db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.id == relacion_id
    ).first()

    if not relacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relación no encontrada"
        )

    db.delete(relacion)
    db.commit()

    return {"message": "Relación eliminada correctamente"}


@router.put("/relaciones/{producto_id}")
async def actualizar_relaciones_producto(
    producto_id: str,
    relaciones: List[RelacionProductoMaterialCreate],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar todas las relaciones de un producto (reemplaza las existentes)"""
    # Verificar que el producto existe
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Eliminar relaciones existentes
    db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.producto_id == producto_id
    ).delete()

    # Crear nuevas relaciones
    nuevas_relaciones = []
    for rel in relaciones:
        # Verificar que el material existe
        material = db.query(InventarioMaterial).filter(
            InventarioMaterial.num_parte == rel.material_num_parte
        ).first()
        if not material:
            raise HTTPException(
                status_code=404,
                detail=f"Material {rel.material_num_parte} no encontrado"
            )

        nueva = RelacionProductoMaterial(
            producto_id=producto_id,
            material_num_parte=rel.material_num_parte,
            tipo_material=rel.tipo_material
        )
        db.add(nueva)
        nuevas_relaciones.append(nueva)

    db.commit()

    return {"message": f"Se actualizaron {len(nuevas_relaciones)} relaciones para el producto {producto_id}"}
