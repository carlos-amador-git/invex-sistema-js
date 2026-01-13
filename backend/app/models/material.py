from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class InventarioMaterial(Base):
    """Inventario de materiales (Welcome Kits, Insertos, Bolsas, etc.)"""
    __tablename__ = "inventario_materiales"

    num_parte = Column(String(50), primary_key=True, index=True)
    descripcion = Column(String(200), nullable=False)
    cantidad_recibida = Column(Integer, default=0)
    fecha_ultimo_ingreso = Column(Date, nullable=True)
    saldo_actual = Column(Integer, default=0)
    fecha_ultimo_movimiento = Column(Date, nullable=True)
    total_almacen_general = Column(Integer, default=0)
    total_piso_produccion = Column(Integer, default=0)
    activo = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relación con productos
    relaciones = relationship("RelacionProductoMaterial", back_populates="material")

    @property
    def total_inventario(self):
        """Total = Almacén General + Piso Producción"""
        return (self.total_almacen_general or 0) + (self.total_piso_produccion or 0)

    @property
    def dias_sin_movimiento(self):
        """Días desde el último movimiento"""
        if not self.fecha_ultimo_movimiento:
            return None
        from datetime import date
        delta = date.today() - self.fecha_ultimo_movimiento
        return delta.days


class RelacionProductoMaterial(Base):
    """Relación entre productos (plásticos) y sus materiales asociados"""
    __tablename__ = "relacion_producto_material"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    material_num_parte = Column(String(50), ForeignKey("inventario_materiales.num_parte"), nullable=False)
    tipo_material = Column(String(50), nullable=False)  # welcome_kit, inserto, bolsa_segurisello, sobre, etiqueta

    # Relaciones
    producto = relationship("Producto", backref="materiales_relacionados")
    material = relationship("InventarioMaterial", back_populates="relaciones")


class MovimientoMaterial(Base):
    """Historial de movimientos de materiales"""
    __tablename__ = "movimientos_materiales"

    id = Column(Integer, primary_key=True, index=True)
    material_num_parte = Column(String(50), ForeignKey("inventario_materiales.num_parte"), nullable=False)
    tipo_movimiento = Column(String(20), nullable=False)  # entrada, salida, ajuste
    cantidad = Column(Integer, nullable=False)
    cantidad_anterior = Column(Integer, nullable=False)
    cantidad_nueva = Column(Integer, nullable=False)
    motivo = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, server_default=func.now())

    # Relaciones
    material = relationship("InventarioMaterial", backref="movimientos")
    usuario = relationship("Usuario", backref="movimientos_material")
