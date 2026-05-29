import type { ZodRawShape, ZodTypeAny } from 'zod';

import type { FormSchema, FormSchemaRuleType } from '../core/types';

import { z } from 'zod';

import { setZodShapeByPath } from './path';
import { normalizeRule } from './rules';

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
    const fieldRule = normalizeRule(schema, rule) as ZodTypeAny;
    setZodShapeByPath(shape, schema.fieldName, fieldRule);
  }

  return z.object(shape);
}
