'use client';

/**
 * Reusable Avatar component.
 * Displays the first character of the name with a colored background.
 *
 * @param {string} name - Name to extract initial from
 * @param {Object} color - Color scheme {bg, t} from SC
 * @param {number} [size=40]
 * @param {Object} [style] - Additional styles
 */
export default function Avatar({
  name,
  color,
  size = 40,
  style: extraStyle,
  ...rest
}) {
  const fontSize = Math.round(size * 0.45);
  const borderRadius = Math.round(size * 0.3);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: color?.bg || '#E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 800,
        color: color?.t || '#6B7280',
        flexShrink: 0,
        ...extraStyle,
      }}
      {...rest}
    >
      {(name || '?')[0]}
    </div>
  );
}
