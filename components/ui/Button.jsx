'use client';

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
 * @param {string} [className]
 * @param {Object} [style] - Additional inline styles (for backward compat)
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
  className = '',
  style: extraStyle,
  ...rest
}) {
  const isDisabled = disabled || loading;

  const sizeClasses = {
    sm: 'py-1 px-2.5 text-[11px] min-h-[30px]',
    md: 'py-2 px-4 text-[13px] min-h-[36px]',
    lg: 'py-2.5 px-5 text-sm min-h-[44px]',
  };

  const variantClasses = {
    primary: 'bg-pr text-white border-none hover:opacity-90',
    secondary: 'bg-sf text-ts border border-bd hover:bg-sfh',
    ghost: 'bg-transparent text-ts border-none hover:bg-sfh',
    danger: 'bg-dn text-white border-none hover:opacity-90',
    accent: 'bg-ac text-white border-none hover:bg-ach',
  };

  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold cursor-pointer font-[inherit] whitespace-nowrap transition-all duration-150';
  const disabledClass = isDisabled ? 'opacity-60 !cursor-not-allowed' : '';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={isDisabled}
      className={`${base} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${disabledClass} ${widthClass} ${className}`}
      style={extraStyle}
      {...rest}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {loading ? (loadingText || '처리 중...') : children}
    </button>
  );
}
