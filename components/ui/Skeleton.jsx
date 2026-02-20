'use client';
import { C } from '@/components/Colors';

/**
 * Skeleton loading placeholder.
 *
 * @param {number|string} [width='100%']
 * @param {number|string} [height=16]
 * @param {number} [borderRadius=8]
 * @param {'text'|'circle'|'card'} [variant='text']
 * @param {Object} [style]
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  variant = 'text',
  style: extraStyle,
}) {
  const variantStyles = {
    text: {},
    circle: { borderRadius: '50%', width: height, height },
    card: { borderRadius: 14, height: height || 120 },
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${C.sfh} 25%, ${C.bl} 50%, ${C.sfh} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...variantStyles[variant],
        ...extraStyle,
      }}
    />
  );
}

/**
 * Skeleton group for common patterns.
 */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div style={{
      background: C.sf, border: '1px solid ' + C.bd,
      borderRadius: 14, padding: 16,
    }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
