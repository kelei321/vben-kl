import type { ZodRawShape, ZodTypeAny } from 'zod';

import type { FormSchema, FormSchemaRuleType } from '../core/types';

import { z } from 'zod';

import { isFormArraySchema } from '../core/types';
import { setZodShapeByPath } from './path';
import { isZodSchema, normalizeRule } from './rules';

export interface BuildZodSchemaOptions {
  dynamicRules?: Record<string, FormSchemaRuleType | undefined>;
  visibleFields?: Record<string, boolean>;
}

export function buildZodSchema(
  schemas: FormSchema[] = [],
  options: BuildZodSchemaOptions = {},
) {
  const shape: ZodRawShape = {};

  for (const schema of schemas) {
    if (!schema.fieldName) {
      continue;
    }
    if (options.visibleFields?.[schema.fieldName] === false) {
      continue;
    }

    const rule = options.dynamicRules?.[schema.fieldName] ?? schema.rules;
    const fieldRule = isFormArraySchema(schema)
      ? buildArrayZodSchema(schema, rule)
      : (normalizeRule(schema, rule) as ZodTypeAny);
    setZodShapeByPath(shape, schema.fieldName, fieldRule);
  }

  return z.object(shape);
}

function buildArrayZodSchema(
  schema: FormSchema,
  rule: FormSchemaRuleType | undefined,
) {
  if (!isFormArraySchema(schema)) {
    return normalizeRule(schema, rule) as ZodTypeAny;
  }

  if (isZodSchema(rule)) {
    return rule;
  }

  const itemShape: ZodRawShape = {};
  for (const child of schema.children) {
    if (child.component === 'Array') {
      console.warn(
        `[VbenForm] nested array schema is not supported: ${schema.fieldName}.${child.fieldName}`,
      );
      continue;
    }
    const childRule = normalizeRule(child, child.rules) as ZodTypeAny;
    setZodShapeByPath(itemShape, child.fieldName, childRule);
  }

  let arrayRule = z.array(z.object(itemShape));
  if (schema.minRows !== undefined) {
    arrayRule = arrayRule.min(schema.minRows, `至少保留 ${schema.minRows} 行`);
  }
  if (schema.maxRows !== undefined) {
    arrayRule = arrayRule.max(schema.maxRows, `最多允许 ${schema.maxRows} 行`);
  }
  return arrayRule;
}
