import type { ZodTypeAny } from 'zod';

import type { FormSchema, Recordable, VbenFormProps } from './types';

import { cloneDeep, get, isEqual, mergeWithArrayOverride } from '@vben-core/shared/utils';

import { z } from 'zod';

import {
  getAsyncOptionsQueryClient,
  getAsyncOptionsQueryKeyPrefix,
} from './async-options';
import { createDeferred, type Deferred } from './deferred';
import { resolveFieldNamePath } from './field-name';
import { isFormArraySchema } from './types';
import { createDefaultItem } from '../zod/build-default-values';
import { buildZodSchema } from '../zod/build-schema';
import { getValueByPath, setValueByPath } from '../zod/path';

function createDefaultState(): VbenFormProps {
  return {
    actionPosition: 'right',
    collapsed: false,
    collapsedRows: 1,
    collapseTriggerResize: false,
    compact: false,
    handleReset: undefined,
    handleSubmit: undefined,
    handleValuesChange: undefined,
    layout: 'horizontal',
    resetButtonOptions: { content: '重置', show: true },
    schema: [],
    scrollToFirstError: false,
    showCollapseButton: false,
    showDefaultActions: true,
    submitButtonOptions: { content: '提交', show: true },
    submitOnChange: false,
    submitOnEnter: false,
  };
}

function createFormActionsProxy(forms: FormActions[]) {
  const proxy: Record<string, any> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'state') {
          return forms[0]?.state;
        }
        const methods = forms.map((form) => form[prop]).filter(Boolean);
        if (methods.every((method) => typeof method === 'function')) {
          return async (...args: any[]) => {
            const results = await Promise.all(
              methods.map((method) => method.apply(forms[0], args)),
            );
            const needMerge = results.every(
              (item) => item && typeof item === 'object' && !Array.isArray(item),
            );
            return needMerge ? Object.assign({}, ...results) : results;
          };
        }
        return proxy[prop];
      },
    },
  );

  return proxy;
}

function fieldNameToSelector(fieldName: string) {
  return `[name="${CSS.escape(fieldName)}"]`;
}

function isDateLike(value: any) {
  return (
    value instanceof Date ||
    (value &&
      typeof value === 'object' &&
      '$d' in value &&
      typeof value.format === 'function')
  );
}

function mergePatch<T extends Record<string, any>>(target: T, patch: Partial<T>): T {
  if (!patch || typeof patch !== 'object') {
    return target;
  }

  const result: Record<string, any> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !isDateLike(value) &&
      !(value instanceof RegExp) &&
      !(value instanceof Map) &&
      !(value instanceof Set) &&
      !(typeof (value as ZodTypeAny).safeParse === 'function')
    ) {
      result[key] = mergePatch(result[key] ?? {}, value as Record<string, any>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function zodErrorToFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return errors;
}

export interface FormActions {
  [key: string]: any;
  getAllErrors?: () => any;
  getFieldMeta?: (fieldName: string) => any;
  getFieldValue?: (fieldName: string) => any;
  handleSubmit?: (...args: any[]) => Promise<void> | void;
  moveFieldValues?: (fieldName: string, from: number, to: number) => void;
  pushFieldValue?: (fieldName: string, value: any) => void;
  removeFieldValue?: (fieldName: string, index: number) => void;
  reset?: (values?: Recordable, opts?: Recordable) => void;
  resetField?: (fieldName: string) => void;
  setFieldValue?: (fieldName: string, value: any, options?: any) => void;
  state?: any;
  swapFieldValues?: (fieldName: string, aIndex: number, bIndex: number) => void;
  validate?: (...args: any[]) => any | Promise<any>;
  validateField?: (...args: any[]) => any | Promise<any>;
}

export class FormApi {
  form?: FormActions;
  private componentRefMap = new Map<string, unknown>();
  private isMounted = false;
  private latestSubmissionValues: Record<string, any> | null = null;
  private mountedDeferred: Deferred<void> = createDeferred();
  private optionsQueryKeyMap = new Map<string, unknown[]>();
  private store: any;

  constructor(options: VbenFormProps = {}) {
    this.store = createFormStore(mergeWithArrayOverride(createDefaultState(), options));
  }

  get state(): VbenFormProps {
    return this.store.state;
  }

  async appendArrayItem(fieldName: string, value?: Recordable) {
    const form = await this.getForm();
    form.pushFieldValue?.(fieldName, value ?? this.createDefaultArrayItem(fieldName));
  }

  async clearValidate(fieldName?: string) {
    const form = await this.getForm();
    if (fieldName) {
      form.validateField?.(fieldName, 'submit');
      return;
    }
    form.validate?.('submit');
  }

  async getForm() {
    if (!this.isMounted) {
      await this.mountedDeferred.promise;
    }
    if (!this.form) {
      throw new Error('<VbenForm /> is not mounted');
    }
    return this.form;
  }

  async getValues() {
    const form = await this.getForm();
    const values = cloneDeep(toRaw(form.state?.values ?? {}));
    return this.transformValues(values);
  }

  async insertArrayItem(fieldName: string, index: number, value?: Recordable) {
    const form = await this.getForm();
    form.insertFieldValue?.(
      fieldName,
      index,
      value ?? this.createDefaultArrayItem(fieldName),
    );
  }

  async moveArrayItem(fieldName: string, from: number, to: number) {
    const form = await this.getForm();
    form.moveFieldValues?.(fieldName, from, to);
  }

  async refreshOptions(fieldName?: string) {
    const queryClient = getAsyncOptionsQueryClient();
    if (fieldName) {
      const queryKey = this.optionsQueryKeyMap.get(fieldName);
      if (!queryKey) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey });
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: [getAsyncOptionsQueryKeyPrefix()],
    });
  }

  registerOptionsQuery(fieldName: string, queryKey: unknown[]) {
    this.optionsQueryKeyMap.set(fieldName, queryKey);
  }

  async removeArrayItem(fieldName: string, index: number) {
    const form = await this.getForm();
    await form.removeFieldValue?.(fieldName, index);
  }

  async removeSchemaByFields(fields: string[]) {
    const fieldSet = new Set(fields);
    const schema = this.state?.schema ?? [];
    this.setState({
      schema: schema.filter((item) => !fieldSet.has(item.fieldName)),
    });
  }

  async resetField(fieldName: string) {
    const form = await this.getForm();
    form.resetField?.(fieldName);
  }

  async resetForm(values?: Recordable, opts?: Recordable) {
    const form = await this.getForm();
    form.reset?.(values, opts);
    await this.state.handleReset?.(
      (await this.getValues()) as Record<string, any>,
    );
  }

  async resetValidate() {
    await this.clearValidate();
  }

  scrollToFirstError(errors: Record<string, any> | string) {
    if (typeof document === 'undefined') {
      return;
    }
    const fieldName = typeof errors === 'string' ? errors : Object.keys(errors)[0];
    if (!fieldName) {
      return;
    }
    const element = document.querySelector(fieldNameToSelector(fieldName));
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  setState(state: Partial<VbenFormProps>) {
    this.store.setState((prev: VbenFormProps) => mergePatch(prev, state));
  }

  setSchema(schema: FormSchema[]) {
    this.setState({ schema });
  }

  async setValues(fields: Recordable, shouldValidate = false, shouldTransform = true) {
    const form = await this.getForm();
    const values = shouldTransform ? this.resolveValuesIn(fields) : fields;

    for (const schema of this.state.schema ?? []) {
      if (!this.hasValueByFieldName(values, schema.fieldName)) {
        continue;
      }
      this.setFieldValueIfChanged(
        form,
        schema.fieldName,
        this.resolveValueByFieldName(values, schema.fieldName),
        { touch: true },
      );
    }

    if (shouldValidate) {
      await this.validate();
    }
  }

  submit(e?: Event) {
    return this.submitForm(e);
  }

  async submitForm(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    const validateResult = await this.validate();
    if (!validateResult.valid) {
      if (this.state?.scrollToFirstError) {
        this.scrollToFirstError(validateResult.errors);
      }
      return;
    }
    const rawValues = toRaw(await this.getValues());
    this.setLatestSubmissionValues(rawValues);
    await this.state.handleSubmit?.(rawValues);
    return rawValues;
  }

  async swapArrayItems(fieldName: string, aIndex: number, bIndex: number) {
    const form = await this.getForm();
    form.swapFieldValues?.(fieldName, aIndex, bIndex);
  }

  unmount() {
    this.form?.reset?.();
    this.componentRefMap = new Map();
    this.optionsQueryKeyMap = new Map();
    this.latestSubmissionValues = null;
    this.isMounted = false;
    this.mountedDeferred = createDeferred();
  }

  unregisterOptionsQuery(fieldName: string) {
    this.optionsQueryKeyMap.delete(fieldName);
  }

  updateSchema(schema: Partial<FormSchema>[]) {
    const updated: Partial<FormSchema>[] = [...schema];
    const hasField = updated.every(
      (item) => Reflect.has(item, 'fieldName') && item.fieldName,
    );

    if (!hasField) {
      console.error(
        'All items in the schema array must have a valid `fieldName` property to be updated',
      );
      return;
    }

    const currentSchema = [...(this.state?.schema ?? [])];
    const updatedMap: Record<string, any> = {};

    updated.forEach((item) => {
      if (item.fieldName) {
        updatedMap[item.fieldName] = item;
      }
    });

    currentSchema.forEach((schema, index) => {
      const updatedData = updatedMap[schema.fieldName];
      if (updatedData) {
        currentSchema[index] = mergePatch(
          schema as Recordable,
          updatedData as Recordable,
        ) as FormSchema;
      }
    });
    this.setState({ schema: currentSchema });
  }

  async validate() {
    const form = await this.getForm();
    if (typeof form.validate === 'function') {
      try {
        await form.validate('submit');
      } catch {
        // TanStack 不同版本 validate 签名可能略有差异，
        // 下面仍会用 Zod 兜底计算结果。
      }
    }

    const values = form.state?.values ?? {};
    const schema = buildZodSchema(this.state.schema ?? [], {
      controller: this as any,
      formApi: form,
      values,
    });
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { errors: {}, valid: true };
    }

    const errors = zodErrorToFieldErrors(result.error);
    if (Object.keys(errors).length > 0) {
      console.error('validate error', errors);
      if (this.state?.scrollToFirstError) {
        this.scrollToFirstError(errors);
      }
    }
    return { errors, valid: false };
  }

  async validateAndSubmitForm() {
    return await this.submitForm();
  }

  async validateField(fieldName: string) {
    const form = await this.getForm();
    if (typeof form.validateField === 'function') {
      try {
        await form.validateField(fieldName, 'submit');
      } catch {
        // ignore, manual zod validation below
      }
    }

    const schema = (this.state.schema ?? []).find(
      (item) => item.fieldName === fieldName,
    );
    if (!schema) {
      return { errors: {}, valid: true };
    }
    const values = form.state?.values ?? {};
    const fullSchema = buildZodSchema([schema], {
      controller: this as any,
      formApi: form,
      values,
    });
    const result = await fullSchema.safeParseAsync(values);
    if (result.success) {
      return { errors: {}, valid: true };
    }
    const errors = zodErrorToFieldErrors(result.error);
    if (this.state?.scrollToFirstError) {
      this.scrollToFirstError(fieldName);
    }
    return { errors, valid: false };
  }

  mount(formActions: FormActions, componentRefMap?: Map<string, unknown>) {
    this.form = formActions;
    this.componentRefMap = componentRefMap ?? this.componentRefMap ?? new Map();
    this.isMounted = true;
    this.mountedDeferred.resolve();
    void this.getValues().then((values) =>
      this.setLatestSubmissionValues(values),
    );
  }

  useStore<T = VbenFormProps>(selector?: (state: VbenFormProps) => T) {
    return this.store.useStore(selector);
  }

  private collectFieldsByMeta(key: 'isDirty' | 'isTouched') {
    const result: string[] = [];
    const form = this.form;
    for (const schema of this.state.schema ?? []) {
      const meta = form?.getFieldMeta?.(schema.fieldName);
      if (meta?.[key]) {
        result.push(schema.fieldName);
      }
    }
    return result;
  }

  private createDefaultArrayItem(fieldName: string) {
    const schema = (this.state.schema ?? []).find(
      (item) => item.fieldName === fieldName,
    );
    if (!schema || !isFormArraySchema(schema)) {
      return {};
    }
    return cloneDeep(schema.defaultItem ?? createDefaultItem(schema.children));
  }

  private deleteValueByFieldName(values: Record<string, any>, fieldName: string) {
    const { pathSegments, rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      Reflect.deleteProperty(values, rawKey);
      return;
    }

    if (!pathSegments || pathSegments.length === 0) {
      Reflect.deleteProperty(values, fieldName);
      return;
    }

    let current: any = values;
    for (const segment of pathSegments.slice(0, -1)) {
      if (!current || typeof current !== 'object') {
        return;
      }
      current = current[segment];
    }

    const last = pathSegments.at(-1);
    if (last && current && typeof current === 'object') {
      Reflect.deleteProperty(current, last);
    }
  }

  private hasValueByFieldName(values: Record<string, any>, fieldName: string) {
    const { rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      return Object.prototype.hasOwnProperty.call(values, rawKey);
    }
    if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
      return true;
    }
    return getValueByPath(values, fieldName) !== undefined;
  }

  private resolveValueByFieldName(values: Record<string, any>, fieldName: string) {
    const { rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      return values[rawKey];
    }
    if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
      return values[fieldName];
    }
    return getValueByPath(values, fieldName);
  }

  private resolveValuesIn(fields: Recordable) {
    const values = cloneDeep(fields);
    for (const schema of this.state.schema ?? []) {
      if (!this.hasValueByFieldName(values, schema.fieldName)) {
        continue;
      }
      const value = this.resolveValueByFieldName(values, schema.fieldName);
      if (schema.transform?.in) {
        setValueByPath(values, schema.fieldName, schema.transform.in(value));
      }
    }
    return values;
  }

  private setFieldValueIfChanged(
    form: FormActions,
    fieldName: string,
    value: any,
    options?: Recordable,
  ) {
    if (isEqual(form.getFieldValue?.(fieldName), value)) {
      return;
    }
    form.setFieldValue?.(fieldName, value, options);
  }

  private setLatestSubmissionValues(values: Record<string, any>) {
    this.latestSubmissionValues = cloneDeep(values);
  }

  private transformValues(values: Recordable) {
    const result = cloneDeep(values);
    for (const schema of this.state.schema ?? []) {
      if (!this.hasValueByFieldName(result, schema.fieldName)) {
        continue;
      }
      const value = this.resolveValueByFieldName(result, schema.fieldName);
      if (schema.transform?.out) {
        setValueByPath(result, schema.fieldName, schema.transform.out(value, result));
      }
    }
    return result;
  }
}

import { toRaw } from 'vue';
import { createFormStore } from '../store/create-form-store';
