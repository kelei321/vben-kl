import type { ZodRawShape, ZodTypeAny } from 'zod';

import type { FormApi } from '../core/form-api';
import type {
  ExtendedFormApi,
  FormActions,
  FormSchema,
  FormSchemaRuleType,
  Recordable,
} from '../core/types';

import { get, isBoolean, isFunction } from '@vben-core/shared/utils';

import { z } from 'zod';

import { resolveFieldNamePath } from '../core/field-name';
import { isFormArraySchema } from '../core/types';
import { setZodShapeByPath } from './path';
import { isZodSchema, normalizeRule } from './rules';

interface DependencyArgs {
  controller: ExtendedFormApi | FormApi;
  formApi: FormActions;
}

export interface BuildZodSchemaOptions {
  controller?: ExtendedFormApi | FormApi;
  dynamicRules?: Record<string, FormSchemaRuleType | undefined>;
  formApi?: FormActions;
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
    await Promise.all(
      arraySchemas.map((schema) =>
        validateArrayRows(schema, values, ctx, options),
      ),
    );
  });
}

function createArrayScopedValues(
  values: Recordable | undefined,
  arrayFieldName: string,
  rows: unknown[],
  row: unknown,
  index: number,
) {
  const baseValues = values ? { ...values } : {};

  return {
    ...baseValues,
    $array: rows,
    $index: index,
    $row: row ?? {},
    [arrayFieldName]: rows,
  };
}

function getDependencyArgs(
  options: BuildZodSchemaOptions,
): DependencyArgs | undefined {
  if (!options.controller || !options.formApi) {
    return undefined;
  }

  return {
    controller: options.controller,
    formApi: options.formApi,
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
  options: BuildZodSchemaOptions,
) {
  const dependencies = child.dependencies;
  if (child.hide || !dependencies) {
    return !child.hide;
  }

  const dependencyArgs = getDependencyArgs(options);
  const whenIf = dependencies.if;
  if (isFunction(whenIf) && dependencyArgs) {
    const { controller, formApi } = dependencyArgs;
    if (!(await whenIf(scopedValues, formApi, controller))) {
      return false;
    }
  } else if (isBoolean(whenIf) && !whenIf) {
    return false;
  }

  const show = dependencies.show;
  if (isFunction(show) && dependencyArgs) {
    const { controller, formApi } = dependencyArgs;
    return !!(await show(scopedValues, formApi, controller));
  }
  if (isBoolean(show)) {
    return show;
  }

  return true;
}

async function resolveArrayChildRule(
  child: FormSchema,
  scopedValues: Recordable,
  options: BuildZodSchemaOptions,
) {
  const dependencies = child.dependencies;
  let required = child.required;
  let rule = child.rules;

  if (dependencies) {
    const dependencyArgs = getDependencyArgs(options);
    if (dependencyArgs) {
      const { controller, formApi } = dependencyArgs;
      if (isFunction(dependencies.required)) {
        required = !!(await dependencies.required(
          scopedValues,
          formApi,
          controller,
        ));
      }

      if (isFunction(dependencies.rules)) {
        rule = await dependencies.rules(scopedValues, formApi, controller);
      }
    }

    if (
      dependencies.required &&
      required === false &&
      (rule === 'required' || rule === 'selectRequired')
    ) {
      rule = undefined;
    }
  }

  return normalizeRule({ ...child, required }, rule) as ZodTypeAny;
}

async function validateArrayChild(
  schema: FormSchema,
  rowIndex: number,
  rowValue: Recordable,
  scopedValues: Recordable,
  child: FormSchema,
  ctx: z.RefinementCtx,
  options: BuildZodSchemaOptions,
) {
  if (child.component === 'Array') {
    return;
  }
  if (!(await isArrayChildVisible(child, scopedValues, options))) {
    return;
  }

  const childRule = await resolveArrayChildRule(child, scopedValues, options);
  const childValue = getValueByFieldName(rowValue, child.fieldName);
  const result = await childRule.safeParseAsync(childValue);
  if (result.success) {
    return;
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

async function validateArrayRow(
  schema: FormSchema,
  values: Recordable,
  rows: unknown[],
  row: unknown,
  rowIndex: number,
  ctx: z.RefinementCtx,
  options: BuildZodSchemaOptions,
) {
  if (!isFormArraySchema(schema)) {
    return;
  }

  const rowValue = row && typeof row === 'object' ? (row as Recordable) : {};
  const scopedValues = createArrayScopedValues(
    values,
    schema.fieldName,
    rows,
    row,
    rowIndex,
  );

  await Promise.all(
    schema.children.map((child) =>
      validateArrayChild(
        schema,
        rowIndex,
        rowValue,
        scopedValues,
        child,
        ctx,
        options,
      ),
    ),
  );
}

async function validateArrayRows(
  schema: FormSchema,
  values: Recordable,
  ctx: z.RefinementCtx,
  options: BuildZodSchemaOptions,
) {
  if (!isFormArraySchema(schema)) {
    return;
  }

  const rows = getValueByFieldName(values, schema.fieldName);
  if (!Array.isArray(rows)) {
    return;
  }

  await Promise.all(
    rows.map((row, rowIndex) =>
      validateArrayRow(schema, values, rows, row, rowIndex, ctx, options),
    ),
  );
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
