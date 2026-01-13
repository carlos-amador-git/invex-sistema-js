from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ForecastResponse(BaseModel):
    id: int
    producto_id: str
    mes: str
    colocacion: int
    trasco_rep: int
    btb: int
    renov_anticipada: int
    forecast_total: int
    disponible_con_compra: int
    disponible_sin_compra: int
    atiende_con_compra: bool
    atiende_sin_compra: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
