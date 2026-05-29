import type { ZodError } from 'zod';

export function zodErrorToFieldErrors(error: ZodError) {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
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
