import type { ZodTypeAny } from 'zod';

import type { FormSchema, FormSchemaRuleType, Recordable } from '../core/types';

import { z } from 'zod';

import { getCustomRule } from '../config';

export function isZodSchema(rule: unknown): rule is ZodTypeAny {
  return !!rule && typeof (rule as ZodTypeAny).safeParse === 'function';
}

export function isEmptyValue(value: any) {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

export function isSelectedValue(value: any) {
  if (value === undefined || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== '';
}

function getLabel(schema: Pick<FormSchema, 'fieldName' | 'label'>) {
  return typeof schema.label === 'string' ? schema.label : schema.fieldName;
}

function createStringRule(
  ruleName: string,
  schema: FormSchema,
  required?: boolean,
) {
  const customRule = getCustomRule(ruleName);
  const label = getLabel(schema);

  const fallbackMessage =
    ruleName === 'selectRequired' ? `请选择${label}` : `请输入${label}`;

  return z.any().superRefine((value, ctx) => {
    if (!required && isEmptyValue(value)) {
      return;
    }

    if (customRule) {
      const result = customRule(value, [], {
        field: schema.fieldName,
        form: {},
        label,
      });
      if (result !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: typeof result === 'string' ? result : fallbackMessage,
        });
      }
      return;
    }

    const passed =
      ruleName === 'selectRequired'
        ? isSelectedValue(value)
        : !isEmptyValue(value);
    if (!passed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: fallbackMessage });
    }
  });
}

export function normalizeRule(
  schema: FormSchema,
  rule: FormSchemaRuleType | undefined = schema.rules,
): ZodTypeAny {
  if (isZodSchema(rule)) {
    return rule;
  }

  if (typeof rule === 'string' && rule.length > 0) {
    return createStringRule(
      rule,
      schema,
      schema.required || rule === 'required' || rule === 'selectRequired',
    );
  }

  if (schema.required) {
    return createStringRule('required', schema, true);
  }

  return z.any().optional();
}

export function buildFieldValidator(
  schema: FormSchema,
  rule?: FormSchemaRuleType,
) {
  const finalRule = normalizeRule(schema, rule);
  const trigger = schema.validateTrigger ?? 'blur';
  const triggers = Array.isArray(trigger) ? trigger : [trigger];
  const validators: Recordable = {};

  for (const item of triggers) {
    if (item === 'input') {
      validators.onChange = finalRule;
      continue;
    }
    validators[`on${item.charAt(0).toUpperCase()}${item.slice(1)}`] = finalRule;
  }

  if (!validators.onSubmit) {
    validators.onSubmit = finalRule;
  }

  return validators;
}
