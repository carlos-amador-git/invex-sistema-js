from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import engine, Base
from .routers import (
    auth_router,
    usuarios_router,
    productos_router,
    proveedores_router,
    inventario_router,
    capturas_router,
    ordenes_router,
    roles_router,
    snapshots_router,
    materiales_router,
    procesos_bau_router,
    inventario_historial_router
)

settings = get_settings()

# Crear tablas
Base.metadata.create_all(bind=engine)

# Crear aplicación FastAPI
app = FastAPI(
    title="INVEX API",
    description="API REST para el Sistema de Control de Inventario de Tarjetas Bancarias",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth_router, prefix="/api")
app.include_router(usuarios_router, prefix="/api")
app.include_router(productos_router, prefix="/api")
app.include_router(proveedores_router, prefix="/api")
app.include_router(inventario_router, prefix="/api")
app.include_router(capturas_router, prefix="/api")
app.include_router(ordenes_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(snapshots_router, prefix="/api")
app.include_router(materiales_router, prefix="/api")
app.include_router(procesos_bau_router, prefix="/api")
app.include_router(inventario_historial_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "INVEX API - Sistema de Control de Inventario",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
