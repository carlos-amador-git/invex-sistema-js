from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class SolicitudCompra(Base):
    """Modelo para solicitudes de compra con datos completos para PDF"""
    __tablename__ = "solicitudes_compra"

    id = Column(Integer, primary_key=True, autoincrement=True)
    folio = Column(String(50), unique=True, nullable=False)  # Folio único de la solicitud

    # Datos del solicitante
    fecha_solicitud = Column(Date, nullable=False)
    solicitante = Column(String(150), nullable=False)
    area = Column(String(100), nullable=True)
    correo = Column(String(100), nullable=True)
    extension = Column(String(20), nullable=True)

    # Autorizador
    autorizador = Column(String(150), nullable=True)

    # Datos presupuestales
    clave_presupuestal = Column(String(50), nullable=True)
    centro_costos = Column(String(50), nullable=True)

    # Usuario del bien
    usuario_bien = Column(String(150), nullable=True)
    area_usuario = Column(String(100), nullable=True)

    # Empresa
    razon_social = Column(String(200), default="BANCO INVEX SA INSTITUCION DE BANCA MULTIPLE")
    area_uso = Column(String(100), nullable=True)

    # Vigencia
    vigencia = Column(String(50), nullable=True)

    # Motivo y tipo de compra
    motivo_compra = Column(Text, nullable=True)
    es_compra_unica = Column(Boolean, default=False)
    es_compra_regular = Column(Boolean, default=True)

    # Datos del producto/servicio
    descripcion = Column(Text, nullable=False)
    cantidad = Column(Integer, nullable=False)
    unidad_medida = Column(String(20), default="PZA")

    # Fechas
    fecha_requerida = Column(Date, nullable=True)

    # Dirección de entrega
    direccion_entrega = Column(Text, nullable=True)

    # Relación con orden de compra (opcional)
    orden_compra_id = Column(String(20), ForeignKey("ordenes_compra.id"), nullable=True)

    # Estatus
    estatus = Column(String(30), default="PENDIENTE")  # PENDIENTE, APROBADA, RECHAZADA, COMPLETADA

    # Auditoría
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Relaciones
    orden_compra = relationship("OrdenCompra", foreign_keys=[orden_compra_id])
    usuario_creador = relationship("Usuario", foreign_keys=[created_by])
