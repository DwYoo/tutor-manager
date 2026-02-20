'use client';

/**
 * Reusable Badge/Tag component.
 *
 * @param {'default'|'success'|'warning'|'danger'|'info'|'accent'} [variant='default']
 * @param {'sm'|'md'} [size='sm']
 * @param {string} [className]
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...rest
}) {
  const variantClasses = {
    default: 'bg-sfh text-ts border-bd',
    success: 'bg-sb text-su border-[#BBF7D0]',
    warning: 'bg-wb text-wn border-[#FDE68A]',
    danger: 'bg-db text-dn border-[#FECACA]',
    info: 'bg-as text-ac border-al',
    accent: 'bg-al text-ac border-ac',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold border ${sizeClasses[size] || sizeClasses.sm} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
