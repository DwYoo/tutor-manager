'use client';

/**
 * Empty state placeholder with optional action button.
 *
 * @param {string} [icon] - Emoji or icon
 * @param {string} title - Main message
 * @param {string} [description] - Secondary message
 * @param {string} [actionLabel] - Button text
 * @param {Function} [onAction] - Button click handler
 * @param {string} [className]
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`text-center py-10 px-5 bg-sf border border-bd rounded-[14px] ${className}`}>
      {icon && <div className="text-[32px] mb-3">{icon}</div>}
      <div className="text-sm font-semibold text-tp mb-1">{title}</div>
      {description && (
        <div className={`text-xs text-tt leading-relaxed ${actionLabel ? 'mb-4' : ''}`}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-ac text-white border-none rounded-lg py-2 px-5 text-[13px] font-semibold cursor-pointer font-[inherit] hover:bg-ach transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
