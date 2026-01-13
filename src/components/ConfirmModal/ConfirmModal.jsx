import React from 'react';
import { AlertTriangle, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';
import './ConfirmModal.css';

const VARIANTS = {
  danger: {
    icon: AlertTriangle,
    iconColor: '#dc2626',
    buttonClass: 'btn-danger',
    iconBg: '#fef2f2'
  },
  warning: {
    icon: AlertCircle,
    iconColor: '#f59e0b',
    buttonClass: 'btn-warning',
    iconBg: '#fffbeb'
  },
  info: {
    icon: CheckCircle,
    iconColor: '#3b82f6',
    buttonClass: 'btn-primary',
    iconBg: '#eff6ff'
  }
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger', // danger, warning, info
  loading = false
}) => {
  if (!isOpen) return null;

  const config = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
        <button className="confirm-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div
          className="confirm-modal-icon"
          style={{ backgroundColor: config.iconBg }}
        >
          <IconComponent size={32} style={{ color: config.iconColor }} />
        </div>

        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button
            className="confirm-modal-btn btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-modal-btn ${config.buttonClass}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
