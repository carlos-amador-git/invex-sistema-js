from .auth import router as auth_router
from .usuarios import router as usuarios_router
from .productos import router as productos_router
from .proveedores import router as proveedores_router
from .inventario import router as inventario_router
from .capturas import router as capturas_router
from .ordenes import router as ordenes_router
from .roles import router as roles_router
from .snapshots import router as snapshots_router
from .materiales import router as materiales_router
from .procesos_bau import router as procesos_bau_router
from .inventario_historial import router as inventario_historial_router

__all__ = [
    "auth_router",
    "usuarios_router",
    "productos_router",
    "proveedores_router",
    "inventario_router",
    "capturas_router",
    "ordenes_router",
    "roles_router",
    "snapshots_router",
    "materiales_router",
    "procesos_bau_router",
    "inventario_historial_router"
]
