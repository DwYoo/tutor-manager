'use client';
import { forwardRef } from 'react';
import { C } from '@/components/Colors';

/**
 * Reusable Input component with label and error support.
 *
 * @param {string} [label] - Label text
 * @param {string} [error] - Error message
 * @param {string} [hint] - Help text
 * @param {'text'|'number'|'email'|'password'|'date'|'tel'} [type='text']
 * @param {boolean} [fullWidth=true]
 * @param {Object} [style] - Additional styles for the input
 * @param {Object} [containerStyle] - Styles for the wrapper div
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  fullWidth = true,
  style: extraStyle,
  containerStyle,
  id,
  ...rest
}, ref) {
  const inputId = id || (label ? `input-${label.replace(/\s/g, '-')}` : undefined);

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: C.tt, marginBottom: 6,
  };

  const inputStyle = {
    width: fullWidth ? '100%' : undefined,
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${error ? C.dn : C.bd}`,
    fontSize: 14,
    color: C.tp,
    background: C.sf,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color .15s',
    ...extraStyle,
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={inputId} style={labelStyle}>{label}</label>}
      <input ref={ref} id={inputId} style={inputStyle} {...rest} />
      {error && <div style={{ fontSize: 11, color: C.dn, marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: C.tt, marginTop: 4 }}>{hint}</div>}
    </div>
  );
});

export default Input;
