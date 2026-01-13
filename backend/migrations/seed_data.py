"""
Script para poblar la base de datos con datos iniciales
Ejecutar: python -m migrations.seed_data
"""
import sys
import os
from datetime import date

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Usuario, Rol, Proveedor, Producto, Inventario, Forecast, HistorialCaptura, OrdenCompra, InventarioMaterial, RelacionProductoMaterial
from app.utils.security import get_password_hash
import json


def seed_roles(db: Session):
    """Insertar roles"""
    roles = [
        {
            "nombre": "admin",
            "descripcion": "Admin Inventario",
            "area": "Inventario",
            "color": "#8b5cf6",
            "modulos": json.dumps(["dashboard", "balance", "forecast", "productos", "ordenes", "usuarios", "configuracion"]),
            "permisos": json.dumps({
                "verTodo": True,
                "editarTodo": True,
                "crearOrdenes": True,
                "gestionarUsuarios": True,
                "verDashboard": True
            })
        },
        {
            "nombre": "tsys",
            "descripcion": "Usuario TSYS",
            "area": "Almacén (TSYS)",
            "color": "#3b82f6",
            "modulos": json.dumps(["captura-tsys", "mi-historial", "dashboard-lectura"]),
            "permisos": json.dumps({
                "editarInventarioTSYS": True,
                "verDashboard": True
            })
        },
        {
            "nombre": "distribucion",
            "descripcion": "Distribución",
            "area": "Distribución",
            "color": "#f59e0b",
            "modulos": json.dumps(["captura-distribucion", "mi-historial", "dashboard-lectura"]),
            "permisos": json.dumps({
                "editarDemandaDistribucion": True,
                "verDashboard": True
            })
        },
        {
            "nombre": "modulos",
            "descripcion": "Módulos",
            "area": "Módulos",
            "color": "#10b981",
            "modulos": json.dumps(["captura-modulos", "mi-historial", "dashboard-lectura"]),
            "permisos": json.dumps({
                "editarDemandaModulos": True,
                "verDashboard": True
            })
        },
        {
            "nombre": "consulta",
            "descripcion": "Directivo",
            "area": "Dirección",
            "color": "#64748b",
            "modulos": json.dumps(["dashboard-lectura"]),
            "permisos": json.dumps({
                "verDashboard": True,
                "soloLectura": True
            })
        }
    ]

    for rol_data in roles:
        existing = db.query(Rol).filter(Rol.nombre == rol_data["nombre"]).first()
        if not existing:
            db.add(Rol(**rol_data))
    db.commit()
    print("✓ Roles insertados")


def seed_usuarios(db: Session):
    """Insertar usuarios"""
    usuarios = [
        {
            "username": "admin",
            "password_hash": get_password_hash("admin123"),
            "nombre": "Carlos Mendoza",
            "email": "carlos.mendoza@banco.com",
            "rol": "admin",
            "face_registered": False,
            "activo": True
        },
        {
            "username": "tsys_user",
            "password_hash": get_password_hash("tsys123"),
            "nombre": "María García",
            "email": "maria.garcia@banco.com",
            "rol": "tsys",
            "face_registered": False,
            "activo": True
        },
        {
            "username": "dist_user",
            "password_hash": get_password_hash("dist123"),
            "nombre": "Roberto Sánchez",
            "email": "roberto.sanchez@banco.com",
            "rol": "distribucion",
            "face_registered": False,
            "activo": True
        },
        {
            "username": "mod_user",
            "password_hash": get_password_hash("mod123"),
            "nombre": "Ana López",
            "email": "ana.lopez@banco.com",
            "rol": "modulos",
            "face_registered": False,
            "activo": True
        },
        {
            "username": "director",
            "password_hash": get_password_hash("dir123"),
            "nombre": "Fernando Ruiz",
            "email": "fernando.ruiz@banco.com",
            "rol": "consulta",
            "face_registered": False,
            "activo": True
        }
    ]

    for user_data in usuarios:
        existing = db.query(Usuario).filter(Usuario.username == user_data["username"]).first()
        if not existing:
            db.add(Usuario(**user_data))
    db.commit()
    print("✓ Usuarios insertados")


def seed_proveedores(db: Session):
    """Insertar proveedores"""
    proveedores = [
        {"nombre": "Thales", "tiempo_entrega": 8, "contacto": "ventas@thales.com"},
        {"nombre": "MyCard", "tiempo_entrega": 6, "contacto": "ventas@mycard.com"},
        {"nombre": "TGS", "tiempo_entrega": 10, "contacto": "ventas@tgs.com"}
    ]

    for prov_data in proveedores:
        existing = db.query(Proveedor).filter(Proveedor.nombre == prov_data["nombre"]).first()
        if not existing:
            db.add(Proveedor(**prov_data))
    db.commit()
    print("✓ Proveedores insertados")


def seed_productos(db: Session):
    """Insertar productos - Lista completa de plásticos"""
    # Obtener IDs de proveedores
    thales = db.query(Proveedor).filter(Proveedor.nombre == "Thales").first()
    mycard = db.query(Proveedor).filter(Proveedor.nombre == "MyCard").first()
    tgs = db.query(Proveedor).filter(Proveedor.nombre == "TGS").first()

    productos = [
        # Voyage
        {"id": "J14885C", "nombre": "MCI INMEDIATA VOYAGE PLATINUM DUAL INT", "proveedor_id": thales.id, "costo_unitario": 2.17, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14886C", "nombre": "MCI NORMAL VOYAGE GOLD DUAL INTERFACE", "proveedor_id": thales.id, "costo_unitario": 2.17, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14887C", "nombre": "MCI NORMAL VOYAGE PLATINUM DUAL INTERF", "proveedor_id": thales.id, "costo_unitario": 2.17, "marca": "Mastercard", "tipo": "Crédito"},
        # HEJ IKEA
        {"id": "J14901I", "nombre": "MCI INMEDIATO HEJCARD (IKEA) DUAL INTE", "proveedor_id": mycard.id, "costo_unitario": 1.43, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14902I", "nombre": "MCI SINGLE PANEL HEJCARD (IKEA) DUAL I", "proveedor_id": mycard.id, "costo_unitario": 1.43, "marca": "Mastercard", "tipo": "Crédito"},
        # Amazon
        {"id": "J14910C", "nombre": "MCI AMAZON TDD DUAL INTERFACE", "proveedor_id": mycard.id, "costo_unitario": 1.50, "marca": "Mastercard", "tipo": "Débito"},
        # Volaris antiguos (inmediatos)
        {"id": "J14941C", "nombre": "MCI NORMAL VOLARIS 1 DUAL INTERFACE", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14942C", "nombre": "MCI NML VOL 2 DUAL INTERFACE", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14943C", "nombre": "MCI NORMAL VOL 0 DUAL INTERFACE", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        # Volaris principales (RELACIÓN CON MATERIALES)
        {"id": "J14967C", "nombre": "Volaris 1", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14968C", "nombre": "Volaris 0", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J14969C", "nombre": "Volaris 2", "proveedor_id": thales.id, "costo_unitario": 10.50, "marca": "Mastercard", "tipo": "Crédito"},
        # Cibanco
        {"id": "J14984H", "nombre": "VSI NML CIBANCO DUAL INTERFACE", "proveedor_id": tgs.id, "costo_unitario": 1.80, "marca": "Visa", "tipo": "Crédito"},
        # BC Serigrafía
        {"id": "J14986", "nombre": "MCI BC SERIGRAFÍA EN MB PRODUC DUAL IN", "proveedor_id": mycard.id, "costo_unitario": 1.20, "marca": "Mastercard", "tipo": "Débito"},
        {"id": "J14987", "nombre": "MCI BC SERIGRAFÍA EN MB DESARROLLO DUA", "proveedor_id": mycard.id, "costo_unitario": 1.20, "marca": "Mastercard", "tipo": "Débito"},
        # Walmart y Sams
        {"id": "J15033I", "nombre": "MCI NORMAL WALMART DUAL INTERFACE", "proveedor_id": mycard.id, "costo_unitario": 1.35, "marca": "Mastercard", "tipo": "Crédito"},
        {"id": "J15034I", "nombre": "MCI NORMAL SAMS CLUB DUAL INTERFACE", "proveedor_id": mycard.id, "costo_unitario": 1.35, "marca": "Mastercard", "tipo": "Crédito"},
    ]

    for prod_data in productos:
        existing = db.query(Producto).filter(Producto.id == prod_data["id"]).first()
        if existing:
            # Actualizar si existe
            for key, value in prod_data.items():
                setattr(existing, key, value)
        else:
            db.add(Producto(**prod_data))
    db.commit()
    print("✓ Productos insertados/actualizados")


def seed_inventario(db: Session):
    """Insertar datos de inventario - Datos reales de plásticos"""
    # Datos del inventario real proporcionado por el usuario
    inventarios = [
        # Voyage
        {"producto_id": "J14885C", "boveda_trabajo": 98, "boveda_principal": 0},
        {"producto_id": "J14886C", "boveda_trabajo": 416, "boveda_principal": 2500},
        {"producto_id": "J14887C", "boveda_trabajo": 109, "boveda_principal": 3500},
        # HEJ IKEA
        {"producto_id": "J14901I", "boveda_trabajo": 118, "boveda_principal": 1500},
        {"producto_id": "J14902I", "boveda_trabajo": 0, "boveda_principal": 0},
        # Amazon
        {"producto_id": "J14910C", "boveda_trabajo": 462, "boveda_principal": 3500},
        # Volaris antiguos (inmediatos)
        {"producto_id": "J14941C", "boveda_trabajo": 272, "boveda_principal": 0},
        {"producto_id": "J14942C", "boveda_trabajo": 280, "boveda_principal": 0},
        {"producto_id": "J14943C", "boveda_trabajo": 268, "boveda_principal": 0},
        # Volaris principales (ESTOS TIENEN RELACIÓN CON MATERIALES)
        {"producto_id": "J14967C", "boveda_trabajo": 2862, "boveda_principal": 18000, "dist_colocacion": 2800, "dist_normal": 900, "mod_colocacion": 2200},
        {"producto_id": "J14968C", "boveda_trabajo": 607, "boveda_principal": 41000, "dist_colocacion": 3500, "dist_normal": 1200, "mod_colocacion": 2800},
        {"producto_id": "J14969C", "boveda_trabajo": 850, "boveda_principal": 21500, "dist_colocacion": 4000, "dist_normal": 1500, "mod_colocacion": 3200},
        # Cibanco
        {"producto_id": "J14984H", "boveda_trabajo": 424, "boveda_principal": 500},
        # BC Serigrafía
        {"producto_id": "J14986", "boveda_trabajo": 9, "boveda_principal": 0},
        {"producto_id": "J14987", "boveda_trabajo": 10, "boveda_principal": 0},
        # Walmart y Sams
        {"producto_id": "J15033I", "boveda_trabajo": 36, "boveda_principal": 1500},
        {"producto_id": "J15034I", "boveda_trabajo": 492, "boveda_principal": 28500},
    ]

    for inv_data in inventarios:
        existing = db.query(Inventario).filter(Inventario.producto_id == inv_data["producto_id"]).first()
        if existing:
            # Actualizar si existe
            for key, value in inv_data.items():
                setattr(existing, key, value)
        else:
            db.add(Inventario(**inv_data))
    db.commit()
    print("✓ Inventario insertado/actualizado")


def seed_forecast(db: Session):
    """Insertar datos de forecast"""
    meses = ["Oct-25", "Nov-25", "Dic-25", "Ene-26", "Feb-26", "Mar-26"]
    productos = ["J14968C", "J14969C", "J14970C"]

    for producto_id in productos:
        for i, mes in enumerate(meses):
            existing = db.query(Forecast).filter(
                Forecast.producto_id == producto_id,
                Forecast.mes == mes
            ).first()
            if not existing:
                forecast = Forecast(
                    producto_id=producto_id,
                    mes=mes,
                    colocacion=5000 + (i * 500),
                    trasco_rep=200 + (i * 20),
                    btb=100 + (i * 10),
                    renov_anticipada=300 + (i * 30),
                    forecast_total=5600 + (i * 560),
                    disponible_con_compra=10000 - (i * 800),
                    disponible_sin_compra=8000 - (i * 1000),
                    atiende_con_compra=True,
                    atiende_sin_compra=i < 3
                )
                db.add(forecast)
    db.commit()
    print("✓ Forecast insertado")


def seed_ordenes(db: Session):
    """Insertar órdenes de compra"""
    thales = db.query(Proveedor).filter(Proveedor.nombre == "Thales").first()

    ordenes = [
        {
            "id": "OC-250136",
            "producto_id": "J14968C",
            "proveedor_id": thales.id,
            "cantidad": 50000,
            "presupuesto": "PYM01",
            "estatus": "En Produccion",
            "fecha_orden": date(2025, 9, 15),
            "fecha_entrega": date(2025, 11, 15),
            "costo_total": 525000.00
        },
        {
            "id": "OC-250137",
            "producto_id": "J14969C",
            "proveedor_id": thales.id,
            "cantidad": 40000,
            "presupuesto": "ADQ7",
            "estatus": "Nueva Compra",
            "fecha_orden": date(2025, 10, 1),
            "fecha_entrega": date(2025, 12, 1),
            "costo_total": 420000.00
        },
        {
            "id": "OC-250138",
            "producto_id": "J14970C",
            "proveedor_id": thales.id,
            "cantidad": 60000,
            "presupuesto": "PYM01",
            "estatus": "En Produccion",
            "fecha_orden": date(2025, 9, 20),
            "fecha_entrega": date(2025, 11, 20),
            "costo_total": 630000.00
        }
    ]

    for orden_data in ordenes:
        existing = db.query(OrdenCompra).filter(OrdenCompra.id == orden_data["id"]).first()
        if not existing:
            db.add(OrdenCompra(**orden_data))
    db.commit()
    print("✓ Órdenes de compra insertadas")


def seed_historial_capturas(db: Session):
    """Insertar historial de capturas"""
    admin = db.query(Usuario).filter(Usuario.username == "admin").first()
    tsys = db.query(Usuario).filter(Usuario.username == "tsys_user").first()
    dist = db.query(Usuario).filter(Usuario.username == "dist_user").first()

    capturas = [
        {
            "usuario_id": tsys.id,
            "producto_id": "J14968C",
            "area": "TSYS",
            "tipo": "Inventario Físico",
            "valores": json.dumps({"bovedaTrabajo": 5000, "bovedaPrincipal": 15000}),
            "estatus": "Aprobado"
        },
        {
            "usuario_id": dist.id,
            "producto_id": "J14968C",
            "area": "Distribucion",
            "tipo": "Colocación Mensual",
            "valores": json.dumps({"colocacion": 3500, "normal": 1200, "devoluciones": 150}),
            "estatus": "Aprobado"
        },
        {
            "usuario_id": admin.id,
            "producto_id": "J14969C",
            "area": "TSYS",
            "tipo": "Inventario Físico",
            "valores": json.dumps({"bovedaTrabajo": 3000, "bovedaPrincipal": 12000}),
            "estatus": "Aprobado"
        }
    ]

    for cap_data in capturas:
        db.add(HistorialCaptura(**cap_data))
    db.commit()
    print("✓ Historial de capturas insertado")


def seed_materiales(db: Session):
    """Insertar inventario de materiales"""
    materiales = [
        {"num_parte": "E14-0596-3", "descripcion": "VOLARIS 0 S/N ORIGINACIÓN", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 1, 2), "saldo_actual": 258, "fecha_ultimo_movimiento": date(2025, 1, 3), "total_almacen_general": 258, "total_piso_produccion": 0},
        {"num_parte": "E14-0597-5", "descripcion": "VOLARIS 1 S/N ORIGINACIÓN", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 1, 2), "saldo_actual": 175, "fecha_ultimo_movimiento": date(2025, 9, 26), "total_almacen_general": 175, "total_piso_produccion": 0},
        {"num_parte": "E14-0598-5", "descripcion": "VOLARIS S/N ORIGINACIÓN", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 1, 2), "saldo_actual": 77, "fecha_ultimo_movimiento": date(2025, 9, 26), "total_almacen_general": 77, "total_piso_produccion": 0},
        {"num_parte": "E14-0607-3", "descripcion": "VOLARIS 0 S/N ORIGINACIÓN", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 9, 22), "saldo_actual": 26400, "fecha_ultimo_movimiento": date(2025, 10, 6), "total_almacen_general": 26400, "total_piso_produccion": 251},
        {"num_parte": "E14-0608-6", "descripcion": "VOLARIS 1 S/N ORIGINACIÓN", "cantidad_recibida": 9000, "fecha_ultimo_ingreso": date(2025, 10, 10), "saldo_actual": 11400, "fecha_ultimo_movimiento": date(2025, 9, 23), "total_almacen_general": 11400, "total_piso_produccion": 1100},
        {"num_parte": "E14-0609-4", "descripcion": "VOLARIS 2 S/N ORIGINACIÓN", "cantidad_recibida": 13630, "fecha_ultimo_ingreso": date(2025, 10, 10), "saldo_actual": 14430, "fecha_ultimo_movimiento": date(2025, 9, 26), "total_almacen_general": 14430, "total_piso_produccion": 450},
        {"num_parte": "E14-0618-8", "descripcion": "WELCOME KIT WALMART", "cantidad_recibida": 10000, "fecha_ultimo_ingreso": date(2025, 10, 8), "saldo_actual": 21800, "fecha_ultimo_movimiento": date(2025, 10, 10), "total_almacen_general": 21800, "total_piso_produccion": 0},
        {"num_parte": "E14-0619-8", "descripcion": "WELCOME KIT SAMS CLUB", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 9, 26), "saldo_actual": 28000, "fecha_ultimo_movimiento": date(2025, 10, 10), "total_almacen_general": 28000, "total_piso_produccion": 0},
        {"num_parte": "E16-0114-7", "descripcion": "ETIQUETA DE SEGURIDAD INVEX BOFA", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2017, 7, 5), "saldo_actual": 143218, "fecha_ultimo_movimiento": date(2017, 1, 18), "total_almacen_general": 143218, "total_piso_produccion": 0},
        {"num_parte": "E16-0115-7", "descripcion": "ETIQUETA TRANSPARENTE PEGADO ACUSE", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2019, 10, 21), "saldo_actual": 0, "fecha_ultimo_movimiento": date(2021, 1, 21), "total_almacen_general": 0, "total_piso_produccion": 0},
        {"num_parte": "E16-0170-6", "descripcion": "ETIQUETAS CIRCULARES DE PAPEL 2.5 CM", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 2, 17), "saldo_actual": 55560, "fecha_ultimo_movimiento": date(2025, 5, 21), "total_almacen_general": 55560, "total_piso_produccion": 0},
        {"num_parte": "E08-1669-6A", "descripcion": "SOBRE TARJETON MONEDERO INVEX", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 1, 20), "saldo_actual": 98000, "fecha_ultimo_movimiento": date(2025, 8, 27), "total_almacen_general": 98000, "total_piso_produccion": 0},
        {"num_parte": "E08-1765-2", "descripcion": "SOBRE TARJETON DEBITO", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2018, 4, 16), "saldo_actual": 4490, "fecha_ultimo_movimiento": date(2019, 11, 14), "total_almacen_general": 4490, "total_piso_produccion": 0},
        {"num_parte": "E08-1884-3", "descripcion": "SOBRE TEND", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2022, 5, 2), "saldo_actual": 9450, "fecha_ultimo_movimiento": date(2022, 2, 26), "total_almacen_general": 9450, "total_piso_produccion": 0},
        {"num_parte": "E14-0522-1", "descripcion": "WELCOME KIT NOW MC", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2022, 6, 1), "saldo_actual": 0, "fecha_ultimo_movimiento": date(2023, 4, 10), "total_almacen_general": 0, "total_piso_produccion": 0},
        {"num_parte": "E14-0522-1A", "descripcion": "WELCOME KIT NOW MC", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2023, 1, 23), "saldo_actual": 0, "fecha_ultimo_movimiento": date(2023, 4, 12), "total_almacen_general": 0, "total_piso_produccion": 0},
        {"num_parte": "E14-0522-1B", "descripcion": "WELCOME KIT NOW MC", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 2, 14), "saldo_actual": 59550, "fecha_ultimo_movimiento": date(2025, 5, 20), "total_almacen_general": 59550, "total_piso_produccion": 1500},
        {"num_parte": "E14-0546-5", "descripcion": "WELCOME KIT AMAZON CONTENEDORES", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2023, 3, 3), "saldo_actual": 10694, "fecha_ultimo_movimiento": date(2023, 3, 14), "total_almacen_general": 10694, "total_piso_produccion": 0},
        {"num_parte": "E14-0569-4", "descripcion": "WELCOME KIT AMAZON CONTENEDORES", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 1, 2), "saldo_actual": 4386, "fecha_ultimo_movimiento": date(2025, 3, 10), "total_almacen_general": 4386, "total_piso_produccion": 0},
        {"num_parte": "E14-0594-1", "descripcion": "WK KIOSKO DÉBITO", "cantidad_recibida": 0, "fecha_ultimo_ingreso": date(2025, 6, 3), "saldo_actual": 550, "fecha_ultimo_movimiento": date(2025, 6, 4), "total_almacen_general": 550, "total_piso_produccion": 0},
        {"num_parte": "E03-1301-2", "descripcion": "INSERTO VOLARIS", "cantidad_recibida": 5000, "fecha_ultimo_ingreso": date(2025, 10, 1), "saldo_actual": 45000, "fecha_ultimo_movimiento": date(2025, 10, 15), "total_almacen_general": 45000, "total_piso_produccion": 500},
        {"num_parte": "E05-0587-9", "descripcion": "BOLSA SEGURISELLO VOLARIS", "cantidad_recibida": 10000, "fecha_ultimo_ingreso": date(2025, 9, 15), "saldo_actual": 35000, "fecha_ultimo_movimiento": date(2025, 10, 10), "total_almacen_general": 35000, "total_piso_produccion": 200},
    ]

    for mat_data in materiales:
        existing = db.query(InventarioMaterial).filter(InventarioMaterial.num_parte == mat_data["num_parte"]).first()
        if not existing:
            db.add(InventarioMaterial(**mat_data))
    db.commit()
    print("✓ Inventario de materiales insertado")


def seed_relaciones_material(db: Session):
    """Crear relaciones entre productos y materiales"""
    # RELACIONES CORRECTAS según la imagen del usuario:
    # | Producto  | ITEM    | Welcome Kit | Inserto    | Bolsa Segurisello |
    # |-----------|---------|-------------|------------|-------------------|
    # | Volaris 0 | J14968C | E14-0607-3  | E03-1301-2 | E05-0587-9        |
    # | Volaris 1 | J14967C | E14-0608-6  | E03-1301-2 | E05-0587-9        |
    # | Volaris 2 | J14969C | E14-0609-4  | E03-1301-2 | E05-0587-9        |

    relaciones = [
        # Volaris 0 (J14968C)
        {"producto_id": "J14968C", "material_num_parte": "E14-0607-3", "tipo_material": "welcome_kit"},
        {"producto_id": "J14968C", "material_num_parte": "E03-1301-2", "tipo_material": "inserto"},
        {"producto_id": "J14968C", "material_num_parte": "E05-0587-9", "tipo_material": "bolsa_segurisello"},
        # Volaris 1 (J14967C) - CORREGIDO: era J14969C
        {"producto_id": "J14967C", "material_num_parte": "E14-0608-6", "tipo_material": "welcome_kit"},
        {"producto_id": "J14967C", "material_num_parte": "E03-1301-2", "tipo_material": "inserto"},
        {"producto_id": "J14967C", "material_num_parte": "E05-0587-9", "tipo_material": "bolsa_segurisello"},
        # Volaris 2 (J14969C) - CORREGIDO: era J14970C
        {"producto_id": "J14969C", "material_num_parte": "E14-0609-4", "tipo_material": "welcome_kit"},
        {"producto_id": "J14969C", "material_num_parte": "E03-1301-2", "tipo_material": "inserto"},
        {"producto_id": "J14969C", "material_num_parte": "E05-0587-9", "tipo_material": "bolsa_segurisello"},
    ]

    # Primero eliminar relaciones antiguas incorrectas
    db.query(RelacionProductoMaterial).filter(
        RelacionProductoMaterial.producto_id.in_(["J14967C", "J14968C", "J14969C", "J14970C"])
    ).delete(synchronize_session=False)
    db.commit()

    # Insertar las relaciones correctas
    for rel_data in relaciones:
        db.add(RelacionProductoMaterial(**rel_data))
    db.commit()
    print("✓ Relaciones producto-material corregidas e insertadas")


def main():
    """Ejecutar todos los seeds"""
    print("\n🚀 Iniciando seed de base de datos INVEX...")
    print("-" * 50)

    # Crear todas las tablas
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_roles(db)
        seed_usuarios(db)
        seed_proveedores(db)
        seed_productos(db)
        seed_inventario(db)
        seed_forecast(db)
        seed_ordenes(db)
        seed_historial_capturas(db)
        seed_materiales(db)
        seed_relaciones_material(db)

        print("-" * 50)
        print("✅ Seed completado exitosamente!")
        print("\n📋 Usuarios creados:")
        print("   - admin / admin123 (Administrador)")
        print("   - tsys_user / tsys123 (TSYS)")
        print("   - dist_user / dist123 (Distribución)")
        print("   - mod_user / mod123 (Módulos)")
        print("   - director / dir123 (Consulta)")
        print()
    except Exception as e:
        print(f"❌ Error durante el seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
