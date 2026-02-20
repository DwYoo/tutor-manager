'use client';
import { C } from '@/components/Colors';

/**
 * Reusable Tabs component.
 *
 * @param {Array<{id: string, label: string}>} tabs - Tab definitions
 * @param {string} activeId - Currently active tab ID
 * @param {Function} onChange - Called with new tab ID
 * @param {'underline'|'pill'} [variant='underline'] - Tab style
 * @param {Object} [style] - Additional styles for the container
 */
export default function Tabs({
  tabs,
  activeId,
  onChange,
  variant = 'underline',
  style: extraStyle,
}) {
  if (variant === 'pill') {
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', ...extraStyle }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: `1px solid ${activeId === t.id ? C.ac : C.bd}`,
              background: activeId === t.id ? C.as : 'transparent',
              fontSize: 12,
              fontWeight: activeId === t.id ? 600 : 400,
              color: activeId === t.id ? C.ac : C.ts,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  // Default: underline variant
  return (
    <div style={{
      display: 'flex', gap: 4,
      borderBottom: '1px solid ' + C.bd,
      overflowX: 'auto',
      ...extraStyle,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeId === t.id ? '2px solid ' + C.ac : '2px solid transparent',
            background: 'none',
            fontSize: 14,
            fontWeight: activeId === t.id ? 600 : 400,
            color: activeId === t.id ? C.ac : C.ts,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
