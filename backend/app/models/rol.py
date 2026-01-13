from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Rol(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)  # admin, tsys, etc.
    descripcion = Column(String(100), nullable=True)
    area = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color
    modulos = Column(Text, nullable=False)  # JSON array
    permisos = Column(Text, nullable=False)  # JSON object
    created_at = Column(DateTime, server_default=func.now())
