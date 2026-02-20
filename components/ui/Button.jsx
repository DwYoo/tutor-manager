'use client';
import { C } from '@/components/Colors';

/**
 * Reusable Button component.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'|'accent'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean} [disabled]
 * @param {boolean} [loading]
 * @param {string} [loadingText]
 * @param {boolean} [fullWidth]
 * @param {React.ReactNode} [icon] - Leading icon
 * @param {Object} [style] - Additional inline styles
 * @param {string} [className]
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  loadingText,
  fullWidth,
  icon,
  style: extraStyle,
  ...rest
}) {
  const sizes = {
    sm: { padding: '5px 10px', fontSize: 11, minHeight: 30 },
    md: { padding: '8px 16px', fontSize: 13, minHeight: 36 },
    lg: { padding: '10px 20px', fontSize: 14, minHeight: 44 },
  };

  const variants = {
    primary: {
      background: C.pr, color: '#fff', border: 'none',
    },
    secondary: {
      background: C.sf, color: C.ts, border: '1px solid ' + C.bd,
    },
    ghost: {
      background: 'transparent', color: C.ts, border: 'none',
    },
    danger: {
      background: C.dn, color: '#fff', border: 'none',
    },
    accent: {
      background: C.ac, color: '#fff', border: 'none',
    },
  };

  const isDisabled = disabled || loading;
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;

  const baseStyle = {
    ...s,
    ...v,
    borderRadius: 8,
    fontWeight: 600,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all .15s',
    opacity: isDisabled ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
    ...extraStyle,
  };

  return (
    <button disabled={isDisabled} style={baseStyle} {...rest}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {loading ? (loadingText || '처리 중...') : children}
    </button>
  );
}
