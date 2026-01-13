# INVEX - Guía de Instalación y Configuración

## Requisitos Previos

- **Node.js** 18+
- **Python** 3.9+
- **npm** o **yarn**

## 1. Configuración del Backend (FastAPI)

### 1.1 Crear entorno virtual e instalar dependencias

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En macOS/Linux:
source venv/bin/activate
# En Windows:
# venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 1.2 Inicializar base de datos con datos semilla

```bash
cd backend
python -m migrations.seed_data
```

Esto creará la base de datos SQLite (`invex.db`) con:
- 5 roles (admin, tsys, distribucion, modulos, consulta)
- 5 usuarios de prueba
- 3 proveedores
- 6 productos
- Datos de inventario y forecast

### 1.3 Iniciar el servidor backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

El API estará disponible en: http://localhost:8000
Documentación Swagger: http://localhost:8000/docs

## 2. Configuración del Frontend (React)

### 2.1 Instalar dependencias

```bash
# Desde la raíz del proyecto
npm install

# Instalar nuevas dependencias requeridas
npm install axios face-api.js
```

### 2.2 Descargar modelos de reconocimiento facial

```bash
# Opción 1: Usar script (macOS/Linux)
chmod +x scripts/download-face-models.sh
./scripts/download-face-models.sh

# Opción 2: Descargar manualmente
# Los modelos deben estar en public/models/
# Descargar de: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

Modelos requeridos en `public/models/`:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

### 2.3 Configurar variables de entorno

El archivo `.env` ya está configurado:
```
REACT_APP_API_URL=http://localhost:8000/api
```

### 2.4 Iniciar el servidor frontend

```bash
npm start
```

La aplicación estará disponible en: http://localhost:3000

## 3. Usuarios de Prueba

| Usuario | Contraseña | Rol | Descripción |
|---------|------------|-----|-------------|
| admin | admin123 | admin | Acceso total al sistema |
| tsys_user | tsys123 | tsys | Captura inventario TSYS |
| dist_user | dist123 | distribucion | Captura distribución |
| mod_user | mod123 | modulos | Captura módulos |
| director | dir123 | consulta | Solo lectura |

## 4. Estructura del Proyecto

```
invex-sistema/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── main.py         # Entry point
│   │   ├── config.py       # Configuración
│   │   ├── database.py     # SQLite connection
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── utils/          # Security, dependencies
│   ├── migrations/
│   │   └── seed_data.py    # Datos iniciales
│   ├── requirements.txt
│   └── .env
│
├── src/                    # Frontend React
│   ├── components/         # Componentes UI
│   ├── context/           # AuthContext
│   ├── services/          # Clientes API
│   ├── utils/             # Utilidades (faceRecognition)
│   └── data/              # Datos estáticos (obsoletos)
│
├── public/
│   └── models/            # Modelos face-api.js
│
└── .env                   # Variables frontend
```

## 5. API Endpoints

### Autenticación
- `POST /api/auth/login` - Login con credenciales
- `POST /api/auth/login/facial` - Login con reconocimiento facial
- `POST /api/auth/refresh` - Refrescar token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Usuario actual

### Usuarios
- `GET /api/usuarios` - Listar usuarios (admin)
- `POST /api/usuarios` - Crear usuario (admin)
- `PUT /api/usuarios/{id}` - Actualizar usuario
- `POST /api/usuarios/{id}/face` - Registrar rostro

### Inventario
- `GET /api/inventario` - Listar inventario
- `GET /api/inventario/{id}/forecast` - Obtener forecast
- `PUT /api/inventario/{id}/tsys` - Actualizar TSYS
- `PUT /api/inventario/{id}/distribucion` - Actualizar distribución
- `PUT /api/inventario/{id}/modulos` - Actualizar módulos

### Otros
- `GET /api/productos` - Listar productos
- `GET /api/proveedores` - Listar proveedores
- `GET /api/ordenes` - Listar órdenes
- `GET /api/capturas` - Historial de capturas
- `GET /api/roles` - Configuración de roles

## 6. Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración (1 hora access, 7 días refresh)
- Validación de roles en cada endpoint
- Descriptores faciales como JSON (128 floats)

## 7. Troubleshooting

### Error: "No se pudo conectar al servidor"
- Verificar que el backend esté corriendo en puerto 8000
- Verificar CORS en backend (configurado para localhost:3000)

### Error: "Modelos de reconocimiento facial no encontrados"
- Verificar que los modelos estén en `public/models/`
- Ejecutar el script de descarga de modelos

### Error: "Token inválido"
- Cerrar sesión y volver a iniciar
- Limpiar localStorage del navegador
