from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import hashlib
import json


class InventarioSnapshot(Base):
    """Snapshot histórico del inventario - inmutable para auditoría"""
    __tablename__ = "inventario_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)

    # Timestamp inmutable del servidor
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    # Datos del inventario al momento del snapshot (JSON)
    datos_inventario = Column(Text, nullable=False)

    # Hash SHA-256 de los datos para verificar integridad
    hash_verificacion = Column(String(64), nullable=False)

    # Tipo de snapshot
    tipo = Column(String(50), default="automatico")  # automatico, manual, captura

    # Usuario que generó el snapshot (si aplica)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Relaciones
    producto = relationship("Producto")
    usuario = relationship("Usuario")

    @staticmethod
    def generar_hash(datos: dict) -> str:
        """Genera hash SHA-256 de los datos para verificar integridad"""
        datos_str = json.dumps(datos, sort_keys=True, default=str)
        return hashlib.sha256(datos_str.encode()).hexdigest()

    @staticmethod
    def verificar_integridad(datos: dict, hash_guardado: str) -> bool:
        """Verifica que los datos no han sido alterados"""
        return InventarioSnapshot.generar_hash(datos) == hash_guardado


class CapturaAuditoria(Base):
    """Registro de auditoría para capturas - completamente inmutable"""
    __tablename__ = "capturas_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    captura_id = Column(Integer, ForeignKey("historial_capturas.id"), nullable=False, unique=True)

    # Timestamp del servidor (no modificable por cliente)
    servidor_timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    # Copia inmutable de los datos originales
    datos_originales = Column(Text, nullable=False)

    # Hash SHA-256 para verificar integridad
    hash_integridad = Column(String(64), nullable=False)

    # Información adicional de auditoría
    ip_cliente = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Relación
    captura = relationship("HistorialCaptura")

    @staticmethod
    def generar_hash(datos: dict) -> str:
        """Genera hash SHA-256 de los datos"""
        datos_str = json.dumps(datos, sort_keys=True, default=str)
        return hashlib.sha256(datos_str.encode()).hexdigest()
