from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Date, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class OrdenCompra(Base):
    __tablename__ = "ordenes_compra"

    id = Column(String(20), primary_key=True)  # OC número (250136)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)

    # Datos de requisición
    requi = Column(String(20), nullable=True)  # R-136
    provision = Column(String(50), nullable=True)  # Jan-25, "enero 7.5K y febrero 7.5K"
    validacion = Column(String(20), nullable=True)  # Validación, Compra, Producción

    # Clasificación
    tipo_material = Column(String(50), nullable=True)  # TARJETAS, WELCOME KIT, SOBRE, etc.
    presupuesto = Column(String(50), nullable=True)  # PLÁSTICOS ADQUISICIÓN, PLÁSTICOS BAU, etc.
    caracteristica = Column(String(50), nullable=True)  # DOBLE PANEL, SINGLE PANEL, SIN PANEL
    nombre_producto = Column(String(100), nullable=True)  # Nombre descriptivo del producto

    # Cantidades y costos
    cantidad = Column(Integer, nullable=False)  # Volumen total
    costo_unitario = Column(Float, nullable=True)  # Precio por unidad
    costo_total = Column(Float, nullable=True)  # Costo total calculado
    descuento = Column(Float, nullable=True)  # Porcentaje de descuento

    # Estado general
    estatus = Column(String(50), default="PENDIENTE")  # PENDIENTE, EN PROCESO, COMPLETADA, PAGADA

    # Fechas
    fecha_orden = Column(Date, nullable=True)  # Fecha de la OC
    fecha_entrega = Column(Date, nullable=True)  # Fecha de entrega esperada/real

    # Auditoría
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relaciones
    producto = relationship("Producto")
    proveedor = relationship("Proveedor")
    entregas = relationship("EntregaParcial", back_populates="orden", cascade="all, delete-orphan")


class EntregaParcial(Base):
    __tablename__ = "entregas_parciales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    orden_id = Column(String(20), ForeignKey("ordenes_compra.id"), nullable=False)
    numero_entrega = Column(Integer, nullable=False)  # 1, 2, 3, etc.

    # Datos de la entrega
    cantidad = Column(Integer, nullable=False)  # Cantidad de esta entrega
    contra_recibo = Column(String(50), nullable=True)  # CR - Folio del expediente
    factura = Column(String(50), nullable=True)  # Número de factura
    fecha_pago = Column(Date, nullable=True)  # Fecha de pago programada
    estatus = Column(String(30), nullable=True)  # PAGADA, EN PROCESO, PENDIENTE
    fecha_entrega = Column(Date, nullable=True)  # Fecha real de entrega
    costo = Column(Float, nullable=True)  # Costo de esta entrega parcial

    # Notas
    notas = Column(Text, nullable=True)

    # Auditoría
    created_at = Column(DateTime, server_default=func.now())

    # Relación inversa
    orden = relationship("OrdenCompra", back_populates="entregas")


class OrdenHistorial(Base):
    """Historial de cambios para auditoría"""
    __tablename__ = "ordenes_historial"

    id = Column(Integer, primary_key=True, autoincrement=True)
    orden_id = Column(String(50), ForeignKey("ordenes_compra.id"), nullable=False)
    campo = Column(String(50), nullable=False)  # Campo modificado
    valor_anterior = Column(Text, nullable=True)
    valor_nuevo = Column(Text, nullable=True)
    usuario_id = Column(Integer, nullable=True)
    usuario_nombre = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    accion = Column(String(20), nullable=False)  # CREATE, UPDATE, DELETE, STATUS_CHANGE
    fecha = Column(DateTime, server_default=func.now())
