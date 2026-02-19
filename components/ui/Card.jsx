'use client';
import { C } from '@/components/Colors';

/**
 * Reusable Card container component.
 *
 * @param {boolean} [hoverable] - Add hover effect
 * @param {boolean} [clickable] - Add pointer cursor
 * @param {string} [padding='16px']
 * @param {Object} [style] - Additional styles
 */
export default function Card({
  children,
  hoverable,
  clickable,
  padding = '16px',
  style: extraStyle,
  ...rest
}) {
  return (
    <div
      className={hoverable ? 'hcard' : undefined}
      style={{
        background: C.sf,
        border: '1px solid ' + C.bd,
        borderRadius: 14,
        padding,
        cursor: clickable || hoverable ? 'pointer' : undefined,
        transition: hoverable ? 'all .12s' : undefined,
        ...extraStyle,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
