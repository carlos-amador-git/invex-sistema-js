import React, { useState, useEffect } from 'react';
import {
  BarChart3, Database, TrendingUp, Package, Building2,
  CreditCard, Users, FileText, History, LogOut, Box, Menu, X, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ activeModule, setActiveModule }) => {
  const { currentUser, getRoleConfig, logout } = useAuth();
  const roleConfig = getRoleConfig();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (moduleId) => {
    setActiveModule(moduleId);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Menú completo con roles permitidos
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: BarChart3, roles: ['admin'] },
    { id: 'dashboard-lectura', label: 'Dashboard', icon: BarChart3, roles: ['tsys', 'distribucion', 'modulos', 'consulta'] },
    { id: 'balance', label: 'Balance de Inventario', icon: Database, roles: ['admin'] },
    { id: 'forecast', label: 'Pronóstico y Planeación', icon: TrendingUp, roles: ['admin'] },
    { id: 'captura-tsys', label: 'Captura de Inventario', icon: Package, roles: ['tsys'] },
    { id: 'materiales', label: 'Inventario Materiales', icon: Box, roles: ['admin', 'tsys'] },
    { id: 'procesos-bau', label: 'Procesos BAU', icon: Layers, roles: ['admin'] },
    { id: 'captura-distribucion', label: 'Captura de Demanda', icon: Building2, roles: ['distribucion'] },
    { id: 'captura-modulos', label: 'Captura de Datos', icon: CreditCard, roles: ['modulos'] },
    { id: 'mi-historial', label: 'Mi Historial', icon: History, roles: ['tsys', 'distribucion', 'modulos'] },
    { id: 'productos', label: 'Catálogo de Productos', icon: CreditCard, roles: ['admin'] },
    { id: 'ordenes', label: 'Órdenes de Compra', icon: FileText, roles: ['admin'] },
    { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users, roles: ['admin'] },
  ];

  // Filtrar menú según rol del usuario
  const menuItems = allMenuItems.filter(item => item.roles.includes(currentUser.rol));

  // Obtener iniciales del usuario
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-invex">
              <span className="logo-invex-text">invex</span>
              <span className="logo-banco-text">Banco</span>
            </div>
            <div className="logo-subtitle-container">
              <span className="logo-subtitle">Sistema de Inventario de Tarjetas</span>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div
          className="role-badge"
          style={{
            backgroundColor: roleConfig.color + '20',
            color: roleConfig.color
          }}
        >
          <span className="role-name">{roleConfig.nombre}</span>
          <span className="role-area">{roleConfig.area}</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon className="nav-icon" size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div
              className="user-avatar"
              style={{
                background: `linear-gradient(135deg, ${roleConfig.color}, ${roleConfig.color}cc)`
              }}
            >
              {getInitials(currentUser.nombre)}
            </div>
            <div className="user-details">
              <span className="user-name">{currentUser.nombre}</span>
              <span className="user-role">{roleConfig.area}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
