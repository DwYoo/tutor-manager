'use client';
import { C } from '@/components/Colors';

/**
 * Reusable Card container component.
 * When clickable, renders with proper keyboard support.
 *
 * @param {boolean} [hoverable] - Add hover effect
 * @param {boolean} [clickable] - Add pointer cursor and keyboard support
 * @param {string} [padding='16px']
 * @param {Function} [onClick] - Click handler
 * @param {Object} [style] - Additional styles
 */
export default function Card({
  children,
  hoverable,
  clickable,
  padding = '16px',
  onClick,
  style: extraStyle,
  ...rest
}) {
  const isInteractive = clickable || hoverable || onClick;

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={hoverable ? 'hcard' : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={{
        background: C.sf,
        border: '1px solid ' + C.bd,
        borderRadius: 14,
        padding,
        cursor: isInteractive ? 'pointer' : undefined,
        transition: hoverable ? 'transform .12s, box-shadow .12s' : undefined,
        ...extraStyle,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
