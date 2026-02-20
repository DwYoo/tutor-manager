'use client';
import { forwardRef } from 'react';

/**
 * Reusable Input component with label and error support.
 *
 * @param {string} [label] - Label text
 * @param {string} [error] - Error message
 * @param {string} [hint] - Help text
 * @param {'text'|'number'|'email'|'password'|'date'|'tel'} [type='text']
 * @param {boolean} [fullWidth=true]
 * @param {string} [className]
 * @param {string} [containerClassName]
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  fullWidth = true,
  className = '',
  containerClassName = '',
  style: extraStyle,
  containerStyle,
  id,
  ...rest
}, ref) {
  const inputId = id || (label ? `input-${label.replace(/\s/g, '-')}` : undefined);

  return (
    <div className={containerClassName} style={containerStyle}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-tt mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`py-2 px-3 rounded-lg border text-sm text-tp bg-sf outline-none font-[inherit] transition-colors duration-150 focus:border-ac ${
          error ? 'border-dn' : 'border-bd'
        } ${fullWidth ? 'w-full' : ''} ${className}`}
        style={extraStyle}
        {...rest}
      />
      {error && <div className="text-[11px] text-dn mt-1">{error}</div>}
      {hint && !error && <div className="text-[11px] text-tt mt-1">{hint}</div>}
    </div>
  );
});

export default Input;
