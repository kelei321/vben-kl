import type { ZodRawShape, ZodTypeAny } from 'zod';

import type {
  FormSchema,
  FormSchemaRuleType,
  Recordable,
} from '../core/types';

import { z } from 'zod';

import { get, isBoolean, isFunction } from '@vben-core/shared/utils';

import { resolveFieldNamePath } from '../core/field-name';
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
  const arraySchemas: FormSchema[] = [];

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

    if (isFormArraySchema(schema)) {
      arraySchemas.push(schema);
    }
  }

  return z.object(shape).superRefine(async (values, ctx) => {
    for (const schema of arraySchemas) {
      await validateArrayRows(schema, values, ctx);
    }
  });
}

function createArrayScopedValues(
  values: Recordable | undefined,
  arrayFieldName: string,
  rows: unknown[],
  row: unknown,
  index: number,
) {
  return {
    ...(values ?? {}),
    $array: rows,
    $index: index,
    $row: row ?? {},
    [arrayFieldName]: rows,
  };
}

function getPathSegments(fieldName: string) {
  const { pathSegments, rawKey } = resolveFieldNamePath(fieldName);
  return rawKey ? [rawKey] : pathSegments;
}

function getValueByFieldName(source: Recordable, fieldName: string) {
  const { rawKey } = resolveFieldNamePath(fieldName);
  if (rawKey) {
    return source?.[rawKey];
  }
  if (Object.prototype.hasOwnProperty.call(source ?? {}, fieldName)) {
    return source[fieldName];
  }
  return get(source ?? {}, fieldName);
}

async function isArrayChildVisible(
  child: FormSchema,
  scopedValues: Recordable,
) {
  const dependencies = child.dependencies;
  if (child.hide || !dependencies) {
    return !child.hide;
  }

  const whenIf = dependencies.if;
  if (isFunction(whenIf)) {
    if (!(await whenIf(scopedValues, {}, {} as any))) {
      return false;
    }
  } else if (isBoolean(whenIf) && !whenIf) {
    return false;
  }

  const show = dependencies.show;
  if (isFunction(show)) {
    return !!(await show(scopedValues, {}, {} as any));
  }
  if (isBoolean(show)) {
    return show;
  }

  return true;
}

async function resolveArrayChildRule(
  child: FormSchema,
  scopedValues: Recordable,
) {
  const dependencies = child.dependencies;
  let required = child.required;
  let rule = child.rules;

  if (dependencies) {
    if (isFunction(dependencies.required)) {
      required = !!(await dependencies.required(scopedValues, {}, {} as any));
    }

    if (isFunction(dependencies.rules)) {
      rule = await dependencies.rules(scopedValues, {}, {} as any);
    } else if (
      dependencies.required &&
      required === false &&
      (rule === 'required' || rule === 'selectRequired')
    ) {
      rule = undefined;
    }
  }

  return normalizeRule({ ...child, required }, rule) as ZodTypeAny;
}

async function validateArrayRows(
  schema: FormSchema,
  values: Recordable,
  ctx: z.RefinementCtx,
) {
  if (!isFormArraySchema(schema)) {
    return;
  }

  const rows = getValueByFieldName(values, schema.fieldName);
  if (!Array.isArray(rows)) {
    return;
  }

  for (const [rowIndex, row] of rows.entries()) {
    const rowValue = row && typeof row === 'object' ? (row as Recordable) : {};
    const scopedValues = createArrayScopedValues(
      values,
      schema.fieldName,
      rows,
      row,
      rowIndex,
    );

    for (const child of schema.children) {
      if (child.component === 'Array') {
        continue;
      }
      if (!(await isArrayChildVisible(child, scopedValues))) {
        continue;
      }

      const childRule = await resolveArrayChildRule(child, scopedValues);
      const childValue = getValueByFieldName(rowValue, child.fieldName);
      const result = await childRule.safeParseAsync(childValue);
      if (result.success) {
        continue;
      }

      const childPath = getPathSegments(child.fieldName);
      for (const childIssue of result.error.issues) {
        ctx.addIssue({
          ...childIssue,
          path: [
            schema.fieldName,
            rowIndex,
            ...childPath,
            ...(childIssue.path ?? []),
          ],
        });
      }
    }
  }
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

  let arrayRule = z.array(z.any());
  if (schema.minRows !== undefined) {
    arrayRule = arrayRule.min(schema.minRows, `至少保留 ${schema.minRows} 行`);
  }
  if (schema.maxRows !== undefined) {
    arrayRule = arrayRule.max(schema.maxRows, `最多允许 ${schema.maxRows} 行`);
  }
  return arrayRule;
}
