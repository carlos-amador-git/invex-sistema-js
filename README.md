# INVEX - Sistema de Control de Inventario de Tarjetas

Sistema completo para la gestión de inventario de tarjetas bancarias con autenticación dual (usuario/contraseña + reconocimiento facial) y control de acceso basado en roles.

## 🚀 Instalación Rápida

```bash
# 1. Descomprimir el archivo
unzip invex-sistema.zip
cd invex-sistema

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start
```

El sistema se abrirá automáticamente en `http://localhost:3000`

---

## 🔐 Credenciales de Acceso

| Rol | Usuario | Contraseña | Acceso |
|-----|---------|------------|--------|
| **Admin Inventario** | `admin` | `admin123` | Acceso total al sistema |
| Usuario TSYS | `tsys_user` | `tsys123` | Captura inventario bóvedas |
| Usuario Distribución | `dist_user` | `dist123` | Captura demanda distribución |
| Usuario Módulos | `mod_user` | `mod123` | Captura datos módulos |
| Consulta/Directivo | `director` | `dir123` | Solo lectura dashboard |

---

## 📋 Roles y Permisos

### 🔑 Admin de Inventario
- Dashboard Ejecutivo con KPIs
- Balance General de Inventario
- Pronóstico y Planeación de Compras
- Catálogo de Productos
- Órdenes de Compra
- Gestión de Usuarios (incluye registro facial)

### 📦 Usuario TSYS (Almacén)
- Captura de Inventario Físico (Bóveda Trabajo + Bóveda Principal)
- Mi Historial de Capturas
- Dashboard (solo lectura)

### 🏢 Usuario Distribución
- Captura de Demanda (Colocación + Emisiones + Devoluciones)
- Mi Historial de Capturas
- Dashboard (solo lectura)

### 💳 Usuario Módulos
- Captura de Datos (Colocación + Stock Seguridad)
- Mi Historial de Capturas
- Dashboard (solo lectura)

### 👁️ Consulta / Directivo
- Dashboard (solo lectura)

---

## 📸 Reconocimiento Facial

El sistema incluye autenticación por reconocimiento facial:

1. En la pantalla de login, seleccionar "Reconocimiento Facial"
2. Permitir acceso a la cámara cuando el navegador lo solicite
3. Posicionar el rostro dentro del marco
4. Presionar "Escanear Rostro"

**Usuarios con facial habilitado:**
- Carlos Mendoza (Admin)
- María García (TSYS)
- Ana López (Módulos)

Para registrar nuevos rostros: Admin → Gestión de Usuarios → "Registrar Rostro"

---

## 🏗️ Estructura del Proyecto

```
invex-sistema/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login/          # Autenticación dual
│   │   ├── Sidebar/        # Navegación por rol
│   │   ├── Dashboard/      # Admin y Solo Lectura
│   │   ├── Balance/        # Balance de inventario
│   │   ├── Forecast/       # Pronóstico con gráficas
│   │   ├── Capturas/       # TSYS, Distribución, Módulos
│   │   ├── Historial/      # Historial de capturas
│   │   ├── Productos/      # Catálogo
│   │   ├── Ordenes/        # Órdenes de compra
│   │   └── Usuarios/       # Gestión con registro facial
│   ├── context/
│   │   └── AuthContext.js  # Estado de autenticación
│   ├── data/
│   │   ├── roles.js        # Configuración de roles
│   │   ├── usuarios.js     # Base de usuarios
│   │   ├── productos.js    # Catálogo de productos
│   │   └── inventario.js   # Datos de inventario
│   ├── styles/
│   │   └── global.css      # Estilos globales
│   ├── App.js
│   ├── App.css
│   └── index.js
└── package.json
```

---

## 📦 Tecnologías Utilizadas

- **React 18** - Framework UI
- **React Router DOM** - Navegación
- **Recharts** - Gráficas
- **Lucide React** - Iconos
- **CSS Modules** - Estilos

---

## 🔧 Scripts Disponibles

```bash
npm start     # Iniciar en modo desarrollo
npm build     # Compilar para producción
npm test      # Ejecutar tests
```

---

## 🚀 Despliegue en Producción

```bash
# Compilar para producción
npm run build

# Los archivos estarán en la carpeta /build
# Subir a cualquier servidor web estático
```

---

## 📝 Notas Importantes

1. **Reconocimiento Facial**: En esta versión demo, el reconocimiento es simulado. Para producción se recomienda:
   - `face-api.js` para procesamiento local
   - AWS Rekognition o Azure Face API para cloud

2. **Autenticación**: Las credenciales están en memoria. Para producción:
   - Implementar API REST con JWT
   - Encriptar contraseñas con bcrypt
   - Base de datos segura para usuarios

3. **Datos**: Los datos de inventario son de ejemplo. Conectar a API/Base de datos real.

---

## 📞 Soporte

Para dudas o mejoras, contactar al equipo de desarrollo.

---

**INVEX Card Inventory System v1.0**
