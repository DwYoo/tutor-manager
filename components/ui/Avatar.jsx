'use client';

/**
 * Reusable Avatar component.
 * Displays the first character of the name with a colored background.
 *
 * @param {string} name - Name to extract initial from
 * @param {Object} color - Color scheme {bg, t} from SC
 * @param {number} [size=40]
 * @param {string} [className]
 * @param {Object} [style] - Additional styles
 */
export default function Avatar({
  name,
  color,
  size = 40,
  className = '',
  style: extraStyle,
  ...rest
}) {
  const fontSize = Math.round(size * 0.45);
  const borderRadius = Math.round(size * 0.3);

  return (
    <div
      className={`flex items-center justify-center font-extrabold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: color?.bg || '#E5E7EB',
        fontSize,
        color: color?.t || '#6B7280',
        ...extraStyle,
      }}
      {...rest}
    >
      {(name || '?')[0]}
    </div>
  );
}
