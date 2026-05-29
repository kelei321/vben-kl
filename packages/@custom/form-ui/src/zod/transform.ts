import type { FormSchema } from '../core/types';

import { deleteValueByPath, getValueByPath, setValueByPath } from './path';

export function applySchemaValueTransforms(
  schemas: FormSchema[] = [],
  originValues: Record<string, any>,
) {
  const values = { ...originValues };

  for (const schema of schemas) {
    if (!('transform' in schema)) {
      continue;
    }
    if (!schema.transform?.out) {
      continue;
    }
    const value = getValueByPath(values, schema.fieldName);
    deleteValueByPath(values, schema.fieldName);
    const nextValue = schema.transform.out(value, values);
    if (nextValue !== undefined) {
      setValueByPath(values, schema.fieldName, nextValue);
    }
  }

  return values;
}
