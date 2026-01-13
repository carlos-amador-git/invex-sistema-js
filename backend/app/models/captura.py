from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class HistorialCaptura(Base):
    __tablename__ = "historial_capturas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    area = Column(String(50), nullable=False)  # TSYS, Distribucion, Modulos
    tipo = Column(String(100), nullable=False)  # Inventario Fisico, Colocacion Mensual
    valores = Column(Text, nullable=False)  # JSON object
    fecha = Column(DateTime, server_default=func.now())
    estatus = Column(String(20), default="Aprobado")  # Pendiente, Aprobado, Rechazado
    ip_address = Column(String(45), nullable=True)

    usuario = relationship("Usuario")
    producto = relationship("Producto")
