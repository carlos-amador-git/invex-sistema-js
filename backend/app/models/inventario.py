from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Inventario(Base):
    __tablename__ = "inventario"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False, unique=True)

    # TSYS (Almacén) - Inmediatos
    boveda_trabajo = Column(Integer, default=0)
    boveda_principal = Column(Integer, default=0)

    # TSYS - Trasco/Rep (Trascodificación/Reposición)
    trasco_rep = Column(Integer, default=0)

    # En Proceso (calculado desde órdenes de compra)
    en_proceso_cantidad = Column(Integer, default=0)
    ordenes_activas = Column(Integer, default=0)

    # Distribución
    dist_colocacion = Column(Integer, default=0)
    dist_normal = Column(Integer, default=0)
    dist_devoluciones = Column(Integer, default=0)

    # Módulos
    mod_colocacion = Column(Integer, default=0)  # Colocación mensual de módulos (para forecast)
    mod_normal = Column(Integer, default=0)      # Inventario físico normal de módulos
    mod_stock = Column(Integer, default=0)       # Stock de seguridad de módulos

    # Datos de compra sugerida
    fecha_compra_sugerida = Column(String(20), nullable=True)
    fecha_entrega_estimada = Column(String(20), nullable=True)
    mes_alerta = Column(String(20), nullable=True)
    presupuesto_pym01 = Column(Integer, default=0)
    presupuesto_adq7 = Column(Integer, default=0)

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    producto = relationship("Producto")
