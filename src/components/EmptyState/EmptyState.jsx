import React from 'react';
import { Package, FileText, CreditCard, AlertCircle, Search, Plus } from 'lucide-react';
import './EmptyState.css';

const ICONS = {
  package: Package,
  file: FileText,
  card: CreditCard,
  alert: AlertCircle,
  search: Search
};

const EmptyState = ({
  icon = 'package',
  title = 'No hay datos',
  description = 'Aún no hay elementos para mostrar.',
  actionLabel,
  onAction,
  variant = 'default' // default, success, info
}) => {
  const IconComponent = ICONS[icon] || Package;

  return (
    <div className={`empty-state ${variant}`}>
      <div className="empty-state-icon">
        <IconComponent size={48} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <button className="empty-state-action" onClick={onAction}>
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
