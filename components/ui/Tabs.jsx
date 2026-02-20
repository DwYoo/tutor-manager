'use client';

/**
 * Reusable Tabs component.
 *
 * @param {Array<{id: string, label: string}>} tabs - Tab definitions
 * @param {string} activeId - Currently active tab ID
 * @param {Function} onChange - Called with new tab ID
 * @param {'underline'|'pill'} [variant='underline'] - Tab style
 * @param {string} [className]
 */
export default function Tabs({
  tabs,
  activeId,
  onChange,
  variant = 'underline',
  className = '',
}) {
  if (variant === 'pill') {
    return (
      <div className={`flex gap-1 flex-nowrap overflow-x-auto ${className}`} role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeId === t.id}
            onClick={() => onChange(t.id)}
            className={`py-1.5 px-4 rounded-lg border text-xs font-[inherit] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeId === t.id
                ? 'border-ac bg-as font-semibold text-ac'
                : 'border-bd bg-transparent font-normal text-ts hover:bg-sfh'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-1 border-b border-bd overflow-x-auto ${className}`} role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeId === t.id}
          onClick={() => onChange(t.id)}
          className={`py-2.5 px-5 border-none bg-transparent text-sm font-[inherit] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            activeId === t.id
              ? 'font-semibold text-ac'
              : 'font-normal text-ts hover:text-tp'
          }`}
          style={{
            borderBottom: `2px solid ${activeId === t.id ? 'var(--color-ac)' : 'transparent'}`,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
