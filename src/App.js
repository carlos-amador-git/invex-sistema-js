import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login/Login';
import Sidebar from './components/Sidebar/Sidebar';
import DashboardAdmin from './components/Dashboard/DashboardAdmin';
import DashboardReadonly from './components/Dashboard/DashboardReadonly';
import Balance from './components/Balance/Balance';
import Forecast from './components/Forecast/Forecast';
import CapturaTSYS from './components/Capturas/CapturaTSYS';
import CapturaDistribucion from './components/Capturas/CapturaDistribucion';
import CapturaModulos from './components/Capturas/CapturaModulos';
import Historial from './components/Historial/Historial';
import Productos from './components/Productos/Productos';
import Ordenes from './components/Ordenes/Ordenes';
import Usuarios from './components/Usuarios/Usuarios';
import InventarioMateriales from './components/Materiales/InventarioMateriales';
import ProcesosBAU from './components/ProcesosBAU/ProcesosBAU';
import './App.css';

// Títulos de módulos
const MODULE_TITLES = {
  'dashboard': 'Dashboard Ejecutivo',
  'dashboard-lectura': 'Dashboard de Inventario',
  'balance': 'Balance General de Inventario',
  'forecast': 'Pronóstico y Planeación de Compras',
  'captura-tsys': 'Captura de Inventario TSYS',
  'captura-distribucion': 'Captura de Demanda - Distribución',
  'captura-modulos': 'Captura de Datos - Módulos',
  'mi-historial': 'Mi Historial de Capturas',
  'productos': 'Catálogo de Productos',
  'ordenes': 'Órdenes de Compra',
  'usuarios': 'Gestión de Usuarios',
  'materiales': 'Inventario de Materiales',
  'procesos-bau': 'Procesos BAU',
};

function App() {
  const { isAuthenticated, currentUser, loading, getRoleConfig } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [selectedProduct, setSelectedProduct] = useState('J14968C');
  const [pendingOrden, setPendingOrden] = useState(null);

  // Establecer módulo inicial según rol (DEBE estar antes de cualquier return)
  React.useEffect(() => {
    if (currentUser) {
      const roleConfig = getRoleConfig();
      if (roleConfig && roleConfig.modulos.length > 0) {
        setActiveModule(roleConfig.modulos[0]);
      }
    }
  }, [currentUser, getRoleConfig]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // No autenticado - mostrar login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Renderizar módulo activo
  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <DashboardAdmin 
            setActiveModule={setActiveModule} 
            setSelectedProduct={setSelectedProduct} 
          />
        );
      case 'dashboard-lectura':
        return <DashboardReadonly />;
      case 'balance':
        return (
          <Balance 
            selectedProduct={selectedProduct} 
            setSelectedProduct={setSelectedProduct} 
          />
        );
      case 'forecast':
        return (
          <Forecast
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            setActiveModule={setActiveModule}
            setPendingOrden={setPendingOrden}
          />
        );
      case 'captura-tsys':
        return <CapturaTSYS />;
      case 'captura-distribucion':
        return <CapturaDistribucion />;
      case 'captura-modulos':
        return <CapturaModulos />;
      case 'mi-historial':
        return <Historial />;
      case 'productos':
        return <Productos />;
      case 'ordenes':
        return (
          <Ordenes
            pendingOrden={pendingOrden}
            setPendingOrden={setPendingOrden}
          />
        );
      case 'usuarios':
        return <Usuarios />;
      case 'materiales':
        return (
          <InventarioMateriales
            setActiveModule={setActiveModule}
            setPendingOrden={setPendingOrden}
          />
        );
      case 'procesos-bau':
        return <ProcesosBAU />;
      default:
        return <DashboardReadonly />;
    }
  };

  // Formatear fecha actual
  const formatDate = () => {
    return new Date().toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule} 
      />
      <main className="main-content">
        <header className="main-header">
          <h1>{MODULE_TITLES[activeModule] || 'Dashboard'}</h1>
          <span className="header-date">{formatDate()}</span>
        </header>
        <div className="module-wrapper">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}

export default App;
