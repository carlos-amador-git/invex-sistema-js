from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from ..database import get_db
from ..models import Usuario
from ..schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse, FaceRegisterRequest
from ..utils.security import get_password_hash
from ..utils.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/", response_model=List[UsuarioResponse])
async def list_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Listar todos los usuarios (solo admin)"""
    usuarios = db.query(Usuario).all()
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener usuario por ID"""
    # Solo admin puede ver otros usuarios
    if current_user.rol != "admin" and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este usuario"
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return usuario


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Crear nuevo usuario (solo admin)"""
    # Verificar username único
    existing = db.query(Usuario).filter(Usuario.username == usuario.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya existe"
        )

    # Verificar email único
    existing_email = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    new_usuario = Usuario(
        username=usuario.username,
        password_hash=get_password_hash(usuario.password),
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol,
        activo=usuario.activo
    )
    db.add(new_usuario)
    db.commit()
    db.refresh(new_usuario)
    return new_usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Actualizar usuario (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    update_data = usuario_data.model_dump(exclude_unset=True)

    # Hash password si se está actualizando
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(usuario, field, value)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}")
async def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Desactivar usuario (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # No permitir desactivar el propio usuario admin
    if usuario.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo"
        )

    usuario.activo = False
    db.commit()
    return {"message": "Usuario desactivado correctamente"}


@router.post("/{usuario_id}/face")
async def register_face(
    usuario_id: int,
    face_data: FaceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Registrar rostro de usuario"""
    # Solo admin o el propio usuario pueden registrar rostro
    if current_user.rol != "admin" and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para registrar este rostro"
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Validar que el descriptor tenga 128 elementos
    if len(face_data.face_descriptor) != 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El descriptor facial debe tener 128 elementos"
        )

    usuario.face_descriptor = json.dumps(face_data.face_descriptor)
    usuario.face_registered = True
    db.commit()

    return {"message": "Rostro registrado correctamente"}


@router.delete("/{usuario_id}/face")
async def delete_face(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["admin"]))
):
    """Eliminar registro facial (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    usuario.face_descriptor = None
    usuario.face_registered = False
    db.commit()

    return {"message": "Registro facial eliminado correctamente"}
