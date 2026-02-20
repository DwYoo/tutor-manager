'use client';

/**
 * Skeleton loading placeholder.
 *
 * @param {number|string} [width='100%']
 * @param {number|string} [height=16]
 * @param {number} [borderRadius=8]
 * @param {'text'|'circle'|'card'} [variant='text']
 * @param {string} [className]
 * @param {Object} [style]
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  variant = 'text',
  className = '',
  style: extraStyle,
}) {
  const variantOverrides = {
    text: {},
    circle: { borderRadius: '50%', width: height, height },
    card: { borderRadius: 14, height: height || 120 },
  };

  return (
    <div
      className={`animate-[shimmer_1.5s_infinite] ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--color-sfh) 25%, var(--color-bl) 50%, var(--color-sfh) 75%)',
        backgroundSize: '200% 100%',
        ...variantOverrides[variant],
        ...extraStyle,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-sf border border-bd rounded-[14px] p-4">
      <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '40%' : '100%'}
          height={10}
          style={{ marginBottom: 8 }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
