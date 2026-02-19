/** File upload validation utilities */

/** Maximum file size: 10MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for general file uploads */
export const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

/** Allowed MIME types for receipt files */
export const RECEIPT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

/** Allowed MIME types for images (seal, etc.) */
export const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Validates a file for upload.
 * @param {File} file - The file to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.maxSize] - Max file size in bytes (default: MAX_FILE_SIZE)
 * @param {string[]} [options.allowedMimes] - Allowed MIME types (default: ALLOWED_MIMES)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file, options = {}) {
  const maxSize = options.maxSize ?? MAX_FILE_SIZE;
  const allowedMimes = options.allowedMimes ?? ALLOWED_MIMES;

  if (!file) {
    return { valid: false, error: '파일이 없습니다' };
  }

  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `파일 크기가 ${sizeMB}MB를 초과합니다 (${Math.round(file.size / (1024 * 1024))}MB)` };
  }

  if (file.size === 0) {
    return { valid: false, error: '빈 파일은 업로드할 수 없습니다' };
  }

  // Check MIME type if available
  if (file.type && allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    return { valid: false, error: `지원하지 않는 파일 형식입니다: ${file.type || '알 수 없음'}` };
  }

  return { valid: true };
}

/**
 * Validates multiple files for upload.
 * @param {FileList|File[]} files
 * @param {Object} [options]
 * @returns {{ validFiles: File[], errors: string[] }}
 */
export function validateFiles(files, options = {}) {
  const validFiles = [];
  const errors = [];

  for (const file of files) {
    const result = validateFile(file, options);
    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { validFiles, errors };
}
