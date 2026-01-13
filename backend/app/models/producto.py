from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(String(20), primary_key=True)  # SKU: J14968C
    nombre = Column(String(150), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    tiempo_entrega = Column(Integer, default=8)  # Semanas
    costo_unitario = Column(Float, nullable=True)
    marca = Column(String(50), nullable=True)  # Visa, Mastercard
    tipo = Column(String(50), nullable=True)  # Credito, Debito, Kit
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    proveedor = relationship("Proveedor")
