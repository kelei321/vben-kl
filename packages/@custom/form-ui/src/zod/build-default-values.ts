import type { ZodTypeAny } from 'zod';

import type { FormSchema } from '../core/types';

import { setValueByPath } from './path';
import { isZodSchema } from './rules';

function extractZodDefault(rule: undefined | ZodTypeAny) {
  if (!rule || !isZodSchema(rule)) {
    return undefined;
  }

  const parsed = rule.safeParse(undefined);
  if (parsed.success) {
    return parsed.data;
  }

  const def: any = (rule as any)._def;
  const defaultValue = def?.defaultValue;
  if (typeof defaultValue === 'function') {
    return defaultValue();
  }
  return defaultValue;
}

function inferEmptyValue(schema: FormSchema) {
  if (
    schema.component === 'Input' ||
    schema.component === 'InputPassword' ||
    schema.component === 'VbenInput' ||
    schema.component === 'VbenInputPassword'
  ) {
    return '';
  }
  return undefined;
}

export function buildDefaultValues(schemas: FormSchema[] = []) {
  const values: Record<string, any> = {};

  for (const schema of schemas) {
    if (!schema.fieldName) {
      continue;
    }

    if (Reflect.has(schema, 'defaultValue')) {
      setValueByPath(
        values,
        schema.fieldName,
        schema.transform?.in?.(schema.defaultValue) ?? schema.defaultValue,
      );
      continue;
    }

    const zodDefault = extractZodDefault(
      schema.rules as undefined | ZodTypeAny,
    );
    if (zodDefault !== undefined) {
      setValueByPath(
        values,
        schema.fieldName,
        schema.transform?.in?.(zodDefault) ?? zodDefault,
      );
      continue;
    }

    const empty = inferEmptyValue(schema);
    if (empty !== undefined) {
      setValueByPath(values, schema.fieldName, empty);
    }
  }

  return values;
}
