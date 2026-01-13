from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    tiempo_entrega = Column(Integer, default=8)  # Semanas
    contacto = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relación con precios
    precios = relationship("PrecioProveedor", back_populates="proveedor")


class PrecioProveedor(Base):
    """Tabla de precios por proveedor y producto"""
    __tablename__ = "precios_proveedor"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    costo_unitario = Column(Float, nullable=False)
    moneda = Column(String(10), default="MXN")
    vigente_desde = Column(Date, nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relaciones
    proveedor = relationship("Proveedor", back_populates="precios")
    producto = relationship("Producto")
