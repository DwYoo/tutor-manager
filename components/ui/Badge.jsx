'use client';
import { C } from '@/components/Colors';

/**
 * Reusable Badge/Tag component.
 *
 * @param {'default'|'success'|'warning'|'danger'|'info'|'accent'} [variant='default']
 * @param {'sm'|'md'} [size='sm']
 * @param {Object} [style] - Additional styles
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  style: extraStyle,
  ...rest
}) {
  const variants = {
    default: { background: C.sfh, color: C.ts, border: C.bd },
    success: { background: C.sb, color: C.su, border: '#BBF7D0' },
    warning: { background: C.wb, color: C.wn, border: '#FDE68A' },
    danger: { background: C.db, color: C.dn, border: '#FECACA' },
    info: { background: C.as, color: C.ac, border: C.al },
    accent: { background: C.al, color: C.ac, border: C.ac },
  };

  const sizes = {
    sm: { fontSize: 10, padding: '2px 6px', borderRadius: 4 },
    md: { fontSize: 12, padding: '3px 8px', borderRadius: 6 },
  };

  const v = variants[variant] || variants.default;
  const s = sizes[size] || sizes.sm;

  return (
    <span
      style={{
        ...s,
        background: v.background,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
        ...extraStyle,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
