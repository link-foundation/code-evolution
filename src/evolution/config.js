export function positiveInteger(value, name, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer in [1, ${max}]`);
  }
  return value;
}

export function safePath(path) {
  if (
    typeof path !== 'string' ||
    !path ||
    path.includes('\0') ||
    path.includes('\\') ||
    path.startsWith('/') ||
    /^[a-z]:/i.test(path)
  ) {
    throw new Error(
      `Expected a relative portable file path: ${JSON.stringify(path)}`
    );
  }
  if (path.split('/').some((part) => ['..', '.', ''].includes(part))) {
    throw new Error(
      `Expected a relative portable file path: ${JSON.stringify(path)}`
    );
  }
  return path;
}
