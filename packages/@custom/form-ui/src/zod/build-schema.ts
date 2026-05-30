import type { ZodRawShape, ZodTypeAny } from 'zod';

import type {
  ExtendedFormApi,
  FormActions,
  FormSchema,
  FormSchemaRuleType,
  Recordable,
} from '../core/types';

import { z } from 'zod';

import { get, isFunction } from '@vben-core/shared/utils';

import { resolveFieldNamePath } from '../core/field-name';
import { isFormArraySchema } from '../core/types';
import { setZodShapeByPath } from './path';
import { isZodSchema, normalizeRule } from './rules';

export interface BuildZodSchemaOptions {
  controller?: ExtendedFormApi;
  dynamicRules?: Record<string, FormSchemaRuleType | undefined>;
  formApi?: FormActions;
  values?: Recordable;
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
      ? buildArrayZodSchema(schema, rule, options)
      : (normalizeRule(schema, rule) as ZodTypeAny);
    setZodShapeByPath(shape, schema.fieldName, fieldRule);
  }

  return z.object(shape);
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

async function resolveArrayChildRule(
  schema: FormSchema,
  child: FormSchema,
  rows: unknown[],
  row: unknown,
  index: number,
  options: BuildZodSchemaOptions,
) {
  const dependencies = child.dependencies;
  let required = child.required;
  let rule = child.rules;

  if (dependencies) {
    const scopedValues = createArrayScopedValues(
      options.values,
      schema.fieldName,
      rows,
      row,
      index,
    );

    if (isFunction(dependencies.required)) {
      required = !!(await dependencies.required(
        scopedValues,
        options.formApi ?? {},
        options.controller as ExtendedFormApi,
      ));
    }

    if (isFunction(dependencies.rules)) {
      rule = await dependencies.rules(
        scopedValues,
        options.formApi ?? {},
        options.controller as ExtendedFormApi,
      );
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
  rows: unknown[],
  ctx: z.RefinementCtx,
  options: BuildZodSchemaOptions,
) {
  if (!isFormArraySchema(schema)) {
    return;
  }

  for (const [rowIndex, row] of rows.entries()) {
    const rowValue = row && typeof row === 'object' ? (row as Recordable) : {};
    for (const child of schema.children) {
      if (child.component === 'Array') {
        console.warn(
          `[VbenForm] nested array schema is not supported: ${schema.fieldName}.${child.fieldName}`,
        );
        continue;
      }

      const childRule = await resolveArrayChildRule(
        schema,
        child,
        rows,
        row,
        rowIndex,
        options,
      );
      const childValue = getValueByFieldName(rowValue, child.fieldName);
      const result = await childRule.safeParseAsync(childValue);
      if (result.success) {
        continue;
      }

      const childPath = getPathSegments(child.fieldName);
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: [rowIndex, ...childPath, ...(issue.path ?? [])],
        });
      }
    }
  }
}

function buildArrayZodSchema(
  schema: FormSchema,
  rule: FormSchemaRuleType | undefined,
  options: BuildZodSchemaOptions,
) {
  if (!isFormArraySchema(schema)) {
    return normalizeRule(schema, rule) as ZodTypeAny;
  }

  if (isZodSchema(rule)) {
    return rule;
  }

  let arrayRule = z.array(z.any()).superRefine(async (rows, ctx) => {
    await validateArrayRows(schema, rows, ctx, options);
  });

  if (schema.minRows !== undefined) {
    arrayRule = arrayRule.min(schema.minRows, `至少保留 ${schema.minRows} 行`);
  }
  if (schema.maxRows !== undefined) {
    arrayRule = arrayRule.max(schema.maxRows, `最多允许 ${schema.maxRows} 行`);
  }
  return arrayRule;
}
