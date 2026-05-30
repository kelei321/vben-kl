import type { ZodError } from 'zod';

function formatIssuePath(path: Array<number | string>) {
  if (path.length === 0) {
    return '_form';
  }

  let result = '';
  for (const segment of path) {
    result +=
      typeof segment === 'number'
        ? `[${segment}]`
        : (result ? '.' : '') + String(segment);
  }
  return result;
}

export function zodErrorToFieldErrors(error: ZodError) {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = formatIssuePath(issue.path);
    errors[key] ??= [];
    errors[key].push(issue.message);
  }
  return errors;
}

export function flattenTanstackErrors(errors: any) {
  if (!errors) {
    return {};
  }
  if (Array.isArray(errors)) {
    return { _form: errors.map(String) };
  }
  return errors;
}
