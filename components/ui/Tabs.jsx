'use client';
import { useRef, useCallback } from 'react';
import { C } from '@/components/Colors';

/**
 * Accessible Tabs component with ARIA tablist pattern.
 * Supports arrow key navigation between tabs.
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
  const tabRefs = useRef({});

  const handleKeyDown = useCallback((e) => {
    const currentIndex = tabs.findIndex(t => t.id === activeId);
    let nextIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== undefined) {
      const nextTab = tabs[nextIndex];
      onChange(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  }, [tabs, activeId, onChange]);

  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', ...extraStyle }}
      >
        {tabs.map(t => {
          const isActive = activeId === t.id;
          return (
            <button
              key={t.id}
              ref={el => { tabRefs.current[t.id] = el; }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={handleKeyDown}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: `1px solid ${isActive ? C.ac : C.bd}`,
                background: isActive ? C.as : 'transparent',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.ac : C.ts,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid ' + C.bd,
        overflowX: 'auto',
        ...extraStyle,
      }}
    >
      {tabs.map(t => {
        const isActive = activeId === t.id;
        return (
          <button
            key={t.id}
            ref={el => { tabRefs.current[t.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={handleKeyDown}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: isActive ? '2px solid ' + C.ac : '2px solid transparent',
              background: 'none',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? C.ac : C.ts,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'color .15s, border-color .15s',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
