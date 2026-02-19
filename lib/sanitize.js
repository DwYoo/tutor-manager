/** HTML escape utility to prevent XSS attacks */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => HTML_ESCAPE_MAP[c]);
}
