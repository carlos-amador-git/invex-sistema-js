from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class ColocacionHistorial(Base):
    """
    Historial de colocación mensual por producto.
    Guarda el valor de colocación (dist + mod) para cada mes.
    Si no hay actualización, se repite el valor del mes anterior.
    """
    __tablename__ = "colocacion_historial"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    mes = Column(String(10), nullable=False)  # Formato: "Mes-YY" (Ene-25, Feb-26, etc.)

    # Valores de colocación
    colocacion_dist = Column(Integer, default=0)  # Colocación de distribución
    colocacion_mod = Column(Integer, default=0)   # Colocación de módulos
    colocacion_total = Column(Integer, default=0) # Total = dist + mod

    # Auditoría
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relaciones
    producto = relationship("Producto")
    usuario = relationship("Usuario")

    # Constraint único para evitar duplicados
    __table_args__ = (
        # Un registro por producto/mes
        {'sqlite_autoincrement': True},
    )
