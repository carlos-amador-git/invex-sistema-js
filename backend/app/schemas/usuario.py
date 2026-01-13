from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UsuarioBase(BaseModel):
    username: str
    nombre: str
    email: EmailStr
    rol: str
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nombre: str
    email: str
    rol: str
    face_registered: bool
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    id: int
    username: str
    nombre: str
    email: str
    rol: str
    face_registered: bool

    class Config:
        from_attributes = True


class FaceRegisterRequest(BaseModel):
    face_descriptor: List[float]  # 128 floats
