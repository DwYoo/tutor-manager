'use client';

/**
 * Reusable Card container component.
 *
 * @param {boolean} [hoverable] - Add hover effect
 * @param {boolean} [clickable] - Add pointer cursor
 * @param {string} [className]
 * @param {Object} [style] - Additional styles
 */
export default function Card({
  children,
  hoverable,
  clickable,
  className = '',
  style: extraStyle,
  ...rest
}) {
  return (
    <div
      className={`bg-sf border border-bd rounded-[14px] p-4 ${
        hoverable ? 'hcard cursor-pointer' : ''
      } ${clickable && !hoverable ? 'cursor-pointer' : ''} ${className}`}
      style={extraStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
