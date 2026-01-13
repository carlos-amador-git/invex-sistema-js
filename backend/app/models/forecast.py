from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Forecast(Base):
    __tablename__ = "forecast"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(String(20), ForeignKey("productos.id"), nullable=False)
    mes = Column(String(10), nullable=False)  # Oct-25, Nov-25, etc.

    colocacion = Column(Integer, default=0)
    trasco_rep = Column(Integer, default=0)
    btb = Column(Integer, default=0)  # Back to Bank
    renov_anticipada = Column(Integer, default=0)
    forecast_total = Column(Integer, default=0)

    disponible_con_compra = Column(Integer, default=0)
    disponible_sin_compra = Column(Integer, default=0)
    atiende_con_compra = Column(Boolean, default=True)
    atiende_sin_compra = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())

    producto = relationship("Producto")
