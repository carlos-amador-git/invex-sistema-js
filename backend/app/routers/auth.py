from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import numpy as np

from ..database import get_db
from ..models import Usuario, Sesion
from ..schemas.auth import LoginRequest, FacialLoginRequest, Token, RefreshTokenRequest
from ..schemas.usuario import UsuarioLogin
from ..utils.security import verify_password, create_access_token, create_refresh_token, verify_token
from ..utils.dependencies import get_current_active_user
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["Autenticación"])
settings = get_settings()


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login con usuario y contraseña"""
    user = db.query(Usuario).filter(
        Usuario.username == request.username,
        Usuario.activo == True
    ).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )

    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()

    # Crear tokens
    access_token = create_access_token(data={"sub": user.id, "username": user.username})
    refresh_token = create_refresh_token(data={"sub": user.id})

    # Guardar refresh token en BD
    session = Sesion(
        usuario_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "username": user.username,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol,
            "face_registered": user.face_registered
        }
    )


@router.post("/login/facial", response_model=Token)
async def login_facial(request: FacialLoginRequest, db: Session = Depends(get_db)):
    """Login con reconocimiento facial"""
    # Obtener usuarios con rostro registrado
    users_with_face = db.query(Usuario).filter(
        Usuario.face_registered == True,
        Usuario.activo == True
    ).all()

    if not users_with_face:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay usuarios con reconocimiento facial registrado"
        )

    # Convertir descriptor entrante a numpy array
    input_descriptor = np.array(request.face_descriptor)

    # Buscar coincidencia
    THRESHOLD = 0.6
    matched_user = None
    min_distance = float('inf')

    for user in users_with_face:
        if user.face_descriptor:
            stored_descriptor = np.array(json.loads(user.face_descriptor))
            distance = np.linalg.norm(input_descriptor - stored_descriptor)
            if distance < min_distance and distance < THRESHOLD:
                min_distance = distance
                matched_user = user

    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo verificar el rostro"
        )

    # Actualizar último acceso
    matched_user.ultimo_acceso = datetime.utcnow()
    db.commit()

    # Crear tokens
    access_token = create_access_token(data={"sub": matched_user.id, "username": matched_user.username})
    refresh_token = create_refresh_token(data={"sub": matched_user.id})

    # Guardar refresh token
    session = Sesion(
        usuario_id=matched_user.id,
        refresh_token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": matched_user.id,
            "username": matched_user.username,
            "nombre": matched_user.nombre,
            "email": matched_user.email,
            "rol": matched_user.rol,
            "face_registered": matched_user.face_registered
        }
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refrescar access token"""
    payload = verify_token(request.refresh_token, "refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresco inválido"
        )

    # Verificar que el refresh token existe y no está revocado
    session = db.query(Sesion).filter(
        Sesion.refresh_token == request.refresh_token,
        Sesion.revoked == False
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no válida"
        )

    user = db.query(Usuario).filter(Usuario.id == payload.get("sub")).first()
    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo"
        )

    # Crear nuevo access token
    access_token = create_access_token(data={"sub": user.id, "username": user.username})

    return Token(
        access_token=access_token,
        refresh_token=request.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "username": user.username,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol,
            "face_registered": user.face_registered
        }
    )


@router.post("/logout")
async def logout(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cerrar sesión (revocar tokens)"""
    # Revocar todas las sesiones del usuario
    db.query(Sesion).filter(
        Sesion.usuario_id == current_user.id,
        Sesion.revoked == False
    ).update({"revoked": True})
    db.commit()

    return {"message": "Sesión cerrada correctamente"}


@router.get("/me", response_model=UsuarioLogin)
async def get_current_user_info(current_user: Usuario = Depends(get_current_active_user)):
    """Obtener información del usuario actual"""
    return current_user
