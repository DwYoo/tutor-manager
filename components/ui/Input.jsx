'use client';
import { forwardRef, useId } from 'react';
import { C } from '@/components/Colors';

/**
 * Reusable Input component with label, error, and hint support.
 * Includes proper ARIA attributes for accessibility.
 *
 * @param {string} [label] - Label text
 * @param {string} [error] - Error message
 * @param {string} [hint] - Help text
 * @param {boolean} [required] - Shows required indicator
 * @param {'text'|'number'|'email'|'password'|'date'|'tel'} [type='text']
 * @param {boolean} [fullWidth=true]
 * @param {Object} [style] - Additional styles for the input
 * @param {Object} [containerStyle] - Styles for the wrapper div
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  required,
  fullWidth = true,
  style: extraStyle,
  containerStyle,
  id: idProp,
  ...rest
}, ref) {
  const autoId = useId();
  const inputId = idProp || autoId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: C.tt, marginBottom: 6,
  };

  const inputStyle = {
    width: fullWidth ? '100%' : undefined,
    padding: '9px 12px',
    borderRadius: 10,
    border: `1px solid ${error ? C.dn : C.bd}`,
    fontSize: 14,
    color: C.tp,
    background: C.sf,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color .15s, box-shadow .15s',
    ...extraStyle,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required && <span style={{ color: C.dn, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        style={inputStyle}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required ? 'true' : undefined}
        onFocus={e => {
          e.target.style.borderColor = error ? C.dn : C.ac;
          e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(220,38,38,.12)' : 'rgba(37,99,235,.12)'}`;
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? C.dn : C.bd;
          e.target.style.boxShadow = 'none';
        }}
        {...rest}
      />
      {error && <div id={errorId} role="alert" style={{ fontSize: 11, color: C.dn, marginTop: 4 }}>{error}</div>}
      {hint && !error && <div id={hintId} style={{ fontSize: 11, color: C.tt, marginTop: 4 }}>{hint}</div>}
    </div>
  );
});

export default Input;
