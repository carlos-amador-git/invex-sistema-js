from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Presupuesto(Base):
    """Catálogo de presupuestos (PYM01, ADQ7, etc.)"""
    __tablename__ = "presupuestos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    descripcion = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class ProcesoBAU(Base):
    """Procesos BAU: Trascodificación, Renovación Anticipada, Bank to Bank"""
    __tablename__ = "procesos_bau"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    tipo_proceso = Column(String(50), nullable=False)  # trascodificacion, renovacion_anticipada, btb
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False)  # 2024, 2025, etc.
    cantidad = Column(Integer, nullable=False, default=0)
    presupuesto_id = Column(Integer, ForeignKey("presupuestos.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Restricción única: no duplicar (producto, tipo, mes, año)
    __table_args__ = (
        UniqueConstraint('producto_id', 'tipo_proceso', 'mes', 'anio', name='uq_proceso_bau_unico'),
    )

    # Relaciones
    producto = relationship("Producto")
    presupuesto = relationship("Presupuesto")
    usuario = relationship("Usuario")


class ProcesoBAUHistorial(Base):
    """Historial de cambios en procesos BAU"""
    __tablename__ = "procesos_bau_historial"

    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey("procesos_bau.id"), nullable=False)
    cantidad_anterior = Column(Integer, nullable=False)
    cantidad_nueva = Column(Integer, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, server_default=func.now())
    ip_address = Column(String(45), nullable=True)

    # Relaciones
    proceso = relationship("ProcesoBAU")
    usuario = relationship("Usuario")
