'use client';
import { C } from '@/components/Colors';

/**
 * Empty state placeholder with optional action button.
 *
 * @param {string} [icon] - Emoji or icon
 * @param {string} title - Main message
 * @param {string} [description] - Secondary message
 * @param {string} [actionLabel] - Button text
 * @param {Function} [onAction] - Button click handler
 * @param {Object} [style]
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style: extraStyle,
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      background: C.sf,
      border: '1px solid ' + C.bd,
      borderRadius: 14,
      ...extraStyle,
    }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: C.tp, marginBottom: 4 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: C.tt, lineHeight: 1.5, marginBottom: actionLabel ? 16 : 0 }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: C.ac, color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 20px',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
