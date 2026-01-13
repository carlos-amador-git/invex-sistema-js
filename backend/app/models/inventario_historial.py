from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class InventarioHistorial(Base):
    """
    Historial mensual de inventario por área y producto.
    Almacena snapshots mensuales para análisis comparativo.
    Áreas: 'tsys', 'distribucion', 'modulos'
    """
    __tablename__ = "inventario_historial"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False)  # 2024, 2025, etc.
    area = Column(String(20), nullable=False)  # 'tsys', 'distribucion', 'modulos'

    # Campos TSYS (solo se usan cuando area='tsys')
    boveda_trabajo = Column(Integer, default=0)
    boveda_principal = Column(Integer, default=0)
    trasco_rep = Column(Integer, default=0)

    # Campos Distribución (solo se usan cuando area='distribucion')
    dist_colocacion = Column(Integer, default=0)
    dist_normal = Column(Integer, default=0)
    dist_devoluciones = Column(Integer, default=0)

    # Campos Módulos (solo se usan cuando area='modulos')
    mod_colocacion = Column(Integer, default=0)
    mod_normal = Column(Integer, default=0)
    mod_stock = Column(Integer, default=0)

    # Auditoría
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relaciones
    producto = relationship("Producto")
    usuario = relationship("Usuario")

    # Constraints
    __table_args__ = (
        UniqueConstraint('producto_id', 'mes', 'anio', 'area', name='uq_inventario_historial'),
        Index('ix_inventario_historial_producto_anio', 'producto_id', 'anio'),
        {'sqlite_autoincrement': True},
    )

    @property
    def mes_formato(self):
        """Retorna el mes en formato 'Mes-YY' (ej: 'Oct-25')"""
        MES_ABREV = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
            7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        }
        return f"{MES_ABREV.get(self.mes, 'Ene')}-{str(self.anio)[-2:]}"

    def get_total(self):
        """Retorna el total según el área"""
        if self.area == 'tsys':
            return (self.boveda_trabajo or 0) + (self.boveda_principal or 0) + (self.trasco_rep or 0)
        elif self.area == 'distribucion':
            return (self.dist_colocacion or 0) + (self.dist_normal or 0) + (self.dist_devoluciones or 0)
        elif self.area == 'modulos':
            return (self.mod_colocacion or 0) + (self.mod_normal or 0) + (self.mod_stock or 0)
        return 0


class InventarioHistorialAuditoria(Base):
    """
    Registro de auditoría para cambios en inventario historial.
    Guarda cada modificación con valor anterior y nuevo.
    """
    __tablename__ = "inventario_historial_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    historial_id = Column(Integer, ForeignKey("inventario_historial.id"), nullable=False)
    campo = Column(String(50), nullable=False)  # Nombre del campo modificado
    valor_anterior = Column(Integer, nullable=True)
    valor_nuevo = Column(Integer, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relaciones
    historial = relationship("InventarioHistorial")
    usuario = relationship("Usuario")

    __table_args__ = (
        Index('ix_auditoria_historial_id', 'historial_id'),
        {'sqlite_autoincrement': True},
    )
