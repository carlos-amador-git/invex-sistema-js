import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Camera, CheckCircle, X, Save, Trash2, Eye, EyeOff, User, Mail, Lock, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES_CONFIG } from '../../data/roles';
import './Usuarios.css';

const ROLES_DISPONIBLES = [
  { id: 'admin', nombre: 'Admin Inventario', descripcion: 'Acceso total al sistema' },
  { id: 'tsys', nombre: 'Usuario TSYS', descripcion: 'Gestión de almacén TSYS' },
  { id: 'distribucion', nombre: 'Distribución', descripcion: 'Gestión de distribución' },
  { id: 'modulos', nombre: 'Módulos', descripcion: 'Gestión de módulos' },
  { id: 'consulta', nombre: 'Directivo', descripcion: 'Solo lectura del dashboard' },
];

const Usuarios = () => {
  const { usuarios, loadUsuarios, addUser, updateUser, deleteUser, registerFace, currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form state para nuevo/editar usuario
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    email: '',
    rol: 'tsys',
    activo: true
  });

  // Cargar usuarios al montar
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        await loadUsuarios();
      } catch (err) {
        setError('Error cargando usuarios');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nombre: '',
      email: '',
      rol: 'tsys',
      activo: true
    });
    setError('');
    setShowPassword(false);
  };

  const handleOpenNewUser = () => {
    resetForm();
    setIsEditing(false);
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user) => {
    setFormData({
      username: user.username,
      password: '', // No mostrar password actual
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo
    });
    setSelectedUser(user);
    setIsEditing(true);
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setIsEditing(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('El email no es válido');
      return false;
    }
    if (!isEditing) {
      if (!formData.username.trim()) {
        setError('El nombre de usuario es requerido');
        return false;
      }
      if (!formData.password || formData.password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');

    try {
      if (isEditing && selectedUser) {
        // Actualizar usuario
        const updateData = {
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          activo: formData.activo
        };
        // Solo incluir password si se cambió
        if (formData.password) {
          updateData.password = formData.password;
        }
        const result = await updateUser(selectedUser.id, updateData);
        if (!result.success) {
          setError(result.error || 'Error actualizando usuario');
          return;
        }
      } else {
        // Crear nuevo usuario
        const result = await addUser(formData);
        if (!result.success) {
          setError(result.error || 'Error creando usuario');
          return;
        }
      }
      handleCloseUserModal();
    } catch (err) {
      setError(err.message || 'Error guardando usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const result = await deleteUser(userId);
      if (!result.success) {
        setError(result.error || 'Error desactivando usuario');
      }
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err.message || 'Error desactivando usuario');
    }
  };

  const handleRegisterFace = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const confirmFaceRegistration = () => {
    if (selectedUser) {
      registerFace(selectedUser.id, null);
      setShowModal(false);
      setSelectedUser(null);
    }
  };

  const getRoleConfig = (rol) => {
    return ROLES_CONFIG[rol] || { nombre: rol, area: 'N/A', color: '#64748b' };
  };

  if (loading) {
    return (
      <div className="usuarios-module">
        <div className="usuarios-loading">
          <Loader2 size={40} className="spin" />
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="usuarios-module">
      <div className="usuarios-header">
        <h2>Gestión de Usuarios</h2>
        <button className="btn btn-primary" onClick={handleOpenNewUser}>
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="usuarios-error">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {usuarios.length === 0 ? (
        <div className="usuarios-empty">
          <User size={48} />
          <h3>No hay usuarios registrados</h3>
          <p>Haz clic en "Nuevo Usuario" para agregar el primer usuario al sistema.</p>
        </div>
      ) : (
        <div className="usuarios-grid">
          {usuarios.map(user => {
            const roleConfig = getRoleConfig(user.rol);
            const isCurrentUser = currentUser && currentUser.id === user.id;

            return (
              <div key={user.id} className={`user-card ${!user.activo ? 'inactive' : ''}`}>
                {!user.activo && (
                  <div className="user-inactive-badge">Inactivo</div>
                )}
                <div className="user-card-header">
                  <div
                    className="user-avatar-lg"
                    style={{ background: `linear-gradient(135deg, ${roleConfig.color}, ${roleConfig.color}cc)` }}
                  >
                    {user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="user-info-main">
                    <h4>{user.nombre}</h4>
                    <span className="user-username">@{user.username}</span>
                    {isCurrentUser && <span className="current-user-badge">Tú</span>}
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-row">
                    <span className="label">Email</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <div className="user-row">
                    <span className="label">Rol</span>
                    <span
                      className="role-tag"
                      style={{
                        backgroundColor: roleConfig.color + '20',
                        color: roleConfig.color
                      }}
                    >
                      {roleConfig.nombre}
                    </span>
                  </div>
                  <div className="user-row">
                    <span className="label">Área</span>
                    <span>{roleConfig.area}</span>
                  </div>
                  <div className="user-row">
                    <span className="label">Reconocimiento Facial</span>
                    {user.face_registered ? (
                      <span className="face-status registered">
                        <CheckCircle size={14} />
                        Registrado
                      </span>
                    ) : (
                      <span className="face-status pending">
                        <X size={14} />
                        No registrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="user-card-actions">
                  {!user.face_registered && user.activo && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRegisterFace(user)}
                    >
                      <Camera size={14} />
                      Registrar Rostro
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenEditUser(user)}
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>
                  {!isCurrentUser && user.activo && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setShowDeleteConfirm(user.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Confirmación de eliminación */}
                {showDeleteConfirm === user.id && (
                  <div className="delete-confirm-overlay">
                    <div className="delete-confirm-content">
                      <p>¿Desactivar usuario <strong>{user.nombre}</strong>?</p>
                      <div className="delete-confirm-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Desactivar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de nuevo/editar usuario */}
      {showUserModal && (
        <div className="modal-overlay" onClick={handleCloseUserModal}>
          <div className="modal-content user-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="close-btn" onClick={handleCloseUserModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label>
                    <User size={16} />
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Pérez García"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <Mail size={16} />
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="usuario@invex.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Shield size={16} />
                      Rol *
                    </label>
                    <select
                      name="rol"
                      value={formData.rol}
                      onChange={handleInputChange}
                      required
                    >
                      {ROLES_DISPONIBLES.map(rol => (
                        <option key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <User size={16} />
                      Usuario {!isEditing && '*'}
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="nombre.usuario"
                      disabled={isEditing}
                      required={!isEditing}
                    />
                    {isEditing && (
                      <small className="form-hint">El nombre de usuario no se puede cambiar</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      <Lock size={16} />
                      Contraseña {!isEditing && '*'}
                    </label>
                    <div className="password-input">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Mínimo 4 caracteres'}
                        required={!isEditing}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleInputChange}
                      />
                      <span className="checkmark"></span>
                      Usuario activo
                    </label>
                  </div>
                )}

                <div className="rol-description">
                  <strong>Descripción del rol:</strong>
                  <p>{ROLES_DISPONIBLES.find(r => r.id === formData.rol)?.descripcion}</p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseUserModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de registro facial */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registro de Reconocimiento Facial</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="step-icon">
                <Camera size={40} />
              </div>
              <h4>Registrar rostro de {selectedUser?.nombre}</h4>
              <ul className="instructions-list">
                <li>Asegúrese de estar en un lugar bien iluminado</li>
                <li>Retire lentes de sol o accesorios que cubran el rostro</li>
                <li>Mire directamente a la cámara</li>
                <li>Se tomarán 3 fotografías desde diferentes ángulos</li>
              </ul>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={confirmFaceRegistration}>
                  Iniciar Captura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
