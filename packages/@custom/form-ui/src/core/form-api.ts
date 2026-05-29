import type { ComponentPublicInstance } from 'vue';

import type {
  FormActions,
  FormSchema,
  Recordable,
  VbenFormProps,
} from './types';

import { isRef, toRaw } from 'vue';

import {
  cloneDeep,
  formatDate,
  get,
  isDate,
  isDayjsObject,
  isEqual,
  isFunction,
  isObject,
  set,
} from '@vben-core/shared/utils';

import { createFormStore } from '../store/create-form-store';
import { createDefaultItem } from '../zod/build-default-values';
import { buildZodSchema } from '../zod/build-schema';
import { zodErrorToFieldErrors } from '../zod/errors';
import { isZodSchema } from '../zod/rules';
import { applySchemaValueTransforms } from '../zod/transform';
import {
  getAsyncOptionsQueryClient,
  getAsyncOptionsQueryKeyPrefix,
} from './async-options';
import { resolveFieldNamePath } from './field-name';
import { isFormArraySchema } from './types';

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function isMergeableObject(value: any) {
  const rawValue = toRaw(value);
  if (
    !isObject(rawValue) ||
    Array.isArray(rawValue) ||
    isDate(rawValue) ||
    isDayjsObject(rawValue) ||
    isZodSchema(rawValue)
  ) {
    return false;
  }

  // Only recursively merge plain config objects such as componentProps.
  // Zod schemas, Vue components, class instances and other rich objects must be
  // replaced as a whole. Deep-merging Zod internals corrupts validators and can
  // throw `keyValidator._parse is not a function` during safeParseAsync.
  const proto = Object.getPrototypeOf(rawValue);
  return proto === Object.prototype || proto === null;
}

function mergePatch<T extends Recordable<any>>(base: T, patch: Partial<T>) {
  const next = { ...(toRaw(base ?? {}) as Recordable<any>) };

  Object.entries(toRaw(patch ?? {})).forEach(([key, value]) => {
    const current = next[key];
    if (isMergeableObject(current) && isMergeableObject(value)) {
      next[key] = mergePatch(current, value as Recordable<any>);
      return;
    }
    next[key] = Array.isArray(value) ? [...value] : value;
  });

  return next as T;
}

export class FormApi {
  public form = {} as FormActions;
  public isMounted = false;
  public state: VbenFormProps;
  public store: ReturnType<typeof createFormStore>;

  private componentRefMap: Map<string, unknown> = new Map();
  private latestSubmissionValues: null | Recordable<any> = null;
  private mountedDeferred = createDeferred();
  private optionsQueryKeyMap: Map<string, unknown[]> = new Map();
  private prevState: null | VbenFormProps = null;

  constructor(options: VbenFormProps = {}) {
    this.store = createFormStore(options);
    this.state = this.readStoreState();

    this.store.subscribe?.(() => {
      this.prevState = this.state;
      this.state = this.readStoreState();
      this.updateState();
    });

    for (const key of Object.getOwnPropertyNames(FormApi.prototype)) {
      const value = (this as any)[key];
      if (key !== 'constructor' && typeof value === 'function') {
        (this as any)[key] = value.bind(this);
      }
    }
  }

  async appendArrayItem(fieldName: string, value?: Recordable) {
    const form = await this.getForm();
    form.pushFieldValue?.(
      fieldName,
      value ?? this.createDefaultArrayItem(fieldName),
    );
  }

  appendSchemaByField(schema: FormSchema | FormSchema[], fieldName?: string) {
    const list = Array.isArray(schema) ? schema : [schema];
    const currentSchema = [...(this.state.schema ?? [])];
    if (!fieldName) {
      this.setState({ schema: [...currentSchema, ...list] });
      return;
    }
    const index = currentSchema.findIndex(
      (item) => item.fieldName === fieldName,
    );
    if (index === -1) {
      this.setState({ schema: [...currentSchema, ...list] });
      return;
    }
    currentSchema.splice(index + 1, 0, ...list);
    this.setState({ schema: currentSchema });
  }

  async clearArrayItems(fieldName: string) {
    const form = await this.getForm();
    form.clearFieldValues?.(fieldName);
  }

  async clearField(fieldName: string) {
    await this.setFieldValue(fieldName, undefined, true);
  }

  async clearValidate(fields?: string | string[]) {
    const form = await this.getForm();
    let targetFields: string[] | undefined;
    if (Array.isArray(fields)) {
      targetFields = fields;
    } else if (fields) {
      targetFields = [fields];
    }
    if (!targetFields) {
      form.setErrorMap?.({});
      return;
    }
    for (const field of targetFields) {
      form.setFieldMeta?.(field, (prev: any) => ({
        ...prev,
        errorMap: {},
        errors: [],
        isValid: true,
      }));
    }
  }

  async focusField(fieldName: string) {
    const componentRef = this.getFieldComponentRef(fieldName) as any;
    componentRef?.focus?.();
    componentRef?.$el?.focus?.();
  }

  getDirtyFields() {
    return this.collectFieldsByMeta('isDirty');
  }

  getFieldComponentRef<T = ComponentPublicInstance>(
    fieldName: string,
  ): T | undefined {
    let target = this.componentRefMap.has(fieldName)
      ? (this.componentRefMap.get(fieldName) as ComponentPublicInstance)
      : undefined;

    if (
      target &&
      (target as any).$?.type?.name === 'AsyncComponentWrapper' &&
      (target as any).$?.subTree?.ref
    ) {
      const subTreeRef = (target as any).$.subTree.ref;
      if (Array.isArray(subTreeRef)) {
        if (subTreeRef.length > 0 && isRef(subTreeRef[0]?.r)) {
          target = subTreeRef[0]?.r.value as ComponentPublicInstance;
        }
      } else if (isRef(subTreeRef.r)) {
        target = subTreeRef.r.value as ComponentPublicInstance;
      }
    }
    return target as T;
  }

  async getFieldError(fieldName: string) {
    const form = await this.getForm();
    const meta = form.getFieldMeta?.(fieldName);
    return meta?.errors?.[0];
  }

  async getFieldValue(fieldName: string) {
    const form = await this.getForm();
    if (typeof form.getFieldValue === 'function') {
      return form.getFieldValue(fieldName);
    }
    return get(form.state?.values ?? {}, fieldName);
  }

  getFocusedField() {
    for (const fieldName of this.componentRefMap.keys()) {
      const ref = this.getFieldComponentRef(fieldName) as any;
      if (!ref || typeof document === 'undefined') {
        continue;
      }
      let el: HTMLElement | null = null;
      if (ref instanceof HTMLElement) {
        el = ref;
      } else if (ref.$el instanceof HTMLElement) {
        el = ref.$el;
      }
      if (
        el &&
        (el === document.activeElement || el.contains(document.activeElement))
      ) {
        return fieldName;
      }
    }
    return undefined;
  }

  getLatestSubmissionValues() {
    return this.latestSubmissionValues || {};
  }

  getState() {
    return this.state;
  }

  getTouchedFields() {
    return this.collectFieldsByMeta('isTouched');
  }

  async getValues<T = Recordable<any>>() {
    const form = await this.getForm();
    const rawValues = cloneDeep(toRaw(form.state?.values ?? {}));
    const rangeValues = this.handleRangeTimeValue(rawValues);
    const formattedValues = this.handleValueFormat(rangeValues);
    return applySchemaValueTransforms(
      this.state.schema ?? [],
      formattedValues,
    ) as T;
  }

  async insertArrayItem(fieldName: string, index: number, value?: Recordable) {
    const form = await this.getForm();
    await form.insertFieldValue?.(
      fieldName,
      index,
      value ?? this.createDefaultArrayItem(fieldName),
    );
  }

  async isFieldValid(fieldName: string) {
    const form = await this.getForm();
    const meta = form.getFieldMeta?.(fieldName);
    if (meta) {
      return meta.isValid !== false && !(meta.errors?.length > 0);
    }
    const result = await this.validateField(fieldName);
    return result.valid;
  }

  merge(formApi: FormApi) {
    const chain = [this, formApi];
    const proxy = new Proxy(formApi, {
      get(target: any, prop: any) {
        if (prop === 'merge') {
          return (nextFormApi: FormApi) => {
            chain.push(nextFormApi);
            return proxy;
          };
        }
        if (prop === 'submitAllForm') {
          return async (needMerge: boolean = true) => {
            const results = await Promise.all(
              chain.map(async (api) => {
                const validateResult = await api.validate();
                if (!validateResult.valid) {
                  return;
                }
                return toRaw((await api.getValues()) || {});
              }),
            );
            return needMerge ? Object.assign({}, ...results) : results;
          };
        }
        return target[prop];
      },
    });

    return proxy;
  }

  mount(formActions: FormActions, componentRefMap?: Map<string, unknown>) {
    // TanStack Form exposes several members, such as `state`, through accessors on
    // the returned API object. `Object.assign({}, formActions)` loses those accessors
    // and makes `form.state` undefined, which then causes `<VbenForm /> is not mounted`.
    this.form = formActions;
    this.componentRefMap = componentRefMap ?? this.componentRefMap ?? new Map();
    this.isMounted = true;
    this.mountedDeferred.resolve();
    void this.getValues().then((values) =>
      this.setLatestSubmissionValues(values),
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
    const firstErrorFieldName =
      typeof errors === 'string' ? errors : Object.keys(errors)[0];
    if (!firstErrorFieldName) {
      return;
    }

    let el = document.querySelector(
      `[name="${firstErrorFieldName}"]`,
    ) as HTMLElement;
    if (!el) {
      const componentRef = this.getFieldComponentRef(
        firstErrorFieldName,
      ) as any;
      if (componentRef?.$el instanceof HTMLElement) {
        el = componentRef.$el;
      }
    }

    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }

  async setFieldError(fieldName: string, message?: string) {
    const form = await this.getForm();
    form.setFieldMeta?.(fieldName, (prev: any) => ({
      ...prev,
      errorMap: message ? { onSubmit: message } : {},
      errors: message ? [message] : [],
      isValid: !message,
    }));
  }

  async setFieldValue(field: string, value: any, shouldValidate?: boolean) {
    const form = await this.getForm();
    this.setFieldValueIfChanged(form, field, value, { touch: true });
    if (shouldValidate) {
      await this.validateField(field);
    }
  }

  setLatestSubmissionValues(values: null | Recordable<any>) {
    this.latestSubmissionValues = values ? { ...toRaw(values) } : null;
  }

  setSchema(schema: FormSchema[]) {
    this.setState({ schema });
  }

  setState(
    stateOrFn:
      | ((prev: VbenFormProps) => Partial<VbenFormProps>)
      | Partial<VbenFormProps>,
  ) {
    this.store.setState((prev: VbenFormProps) => {
      const patch = isFunction(stateOrFn) ? stateOrFn(prev) : stateOrFn;
      return mergePatch(prev, patch as Partial<VbenFormProps>);
    });
    this.state = this.readStoreState();
  }

  async setValues(
    fields: Record<string, any>,
    filterFields: boolean = true,
    shouldValidate: boolean = false,
  ) {
    const form = await this.getForm();

    if (!filterFields) {
      for (const [field, value] of Object.entries(fields)) {
        this.setFieldValueIfChanged(form, field, value, { touch: true });
      }
      if (shouldValidate) {
        await this.validate();
      }
      return;
    }

    // Only set fields that are defined in schema, but do not depend on the
    // current TanStack values object for filtering. When a schema field has no
    // defaultValue, TanStack may not have that key in state.values yet, so the
    // old merge-against-current-values logic filtered out valid setValues input.
    for (const schema of this.state.schema ?? []) {
      if (!this.hasValueByFieldName(fields, schema.fieldName)) {
        continue;
      }
      this.setFieldValueIfChanged(
        form,
        schema.fieldName,
        this.resolveValueByFieldName(fields, schema.fieldName),
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

    const schema = buildZodSchema(this.state.schema ?? []);
    const result = await schema.safeParseAsync(form.state?.values ?? {});

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
    const fullSchema = buildZodSchema([schema]);
    const result = await fullSchema.safeParseAsync(form.state?.values ?? {});
    if (result.success) {
      return { errors: {}, valid: true };
    }
    const errors = zodErrorToFieldErrors(result.error);
    if (this.state?.scrollToFirstError) {
      this.scrollToFirstError(fieldName);
    }
    return { errors, valid: false };
  }

  private collectFieldsByMeta(key: 'isDirty' | 'isTouched') {
    const result: string[] = [];
    const form = this.form;
    for (const schema of this.state.schema ?? []) {
      const meta = form.getFieldMeta?.(schema.fieldName);
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

  private deleteValueByFieldName(
    values: Record<string, any>,
    fieldName: string,
  ) {
    const { pathSegments, rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      Reflect.deleteProperty(values, rawKey);
      return;
    }

    if (!pathSegments || pathSegments.length === 0) {
      Reflect.deleteProperty(values, fieldName);
      return;
    }

    let target: Record<string, any> | undefined = values;

    for (const segment of pathSegments.slice(0, -1)) {
      if (!target || !isObject(target)) {
        return;
      }
      target = target[segment];
    }

    const lastPathSegment = pathSegments.at(-1);
    if (lastPathSegment && target && isObject(target)) {
      Reflect.deleteProperty(target, lastPathSegment);
    }
  }

  private async getForm() {
    if (!this.isMounted) {
      await this.mountedDeferred.promise;
    }
    if (!this.form?.state) {
      throw new Error('<VbenForm /> is not mounted');
    }
    return this.form;
  }

  private handleMultiFields = (originValues: Record<string, any>) => {
    const arrayToStringFields = this.state?.arrayToStringFields;
    if (!arrayToStringFields || !Array.isArray(arrayToStringFields)) {
      return;
    }

    const processFields = (fields: string[], separator: string = ',') => {
      this.processFields(fields, separator, originValues, (value, sep) => {
        if (Array.isArray(value)) {
          return value.join(sep);
        }
        if (typeof value === 'string') {
          if (value === '') {
            return [];
          }
          const escapedSeparator = sep.replaceAll(
            /[.*+?^${}()|[\]\\]/g,
            String.raw`\$&`,
          );
          return value.split(new RegExp(escapedSeparator));
        }
        return value;
      });
    };

    if (arrayToStringFields.every((item) => typeof item === 'string')) {
      const lastItem = (arrayToStringFields[arrayToStringFields.length - 1] ||
        '') as string;
      const fields =
        lastItem.length === 1
          ? (arrayToStringFields.slice(0, -1) as string[])
          : (arrayToStringFields as string[]);
      const separator = lastItem.length === 1 ? lastItem : ',';
      processFields(fields, separator);
      return;
    }

    arrayToStringFields.forEach((fieldConfig) => {
      if (Array.isArray(fieldConfig)) {
        const [fields, separator = ','] = fieldConfig as [string[], string?];
        if (!Array.isArray(fields)) {
          console.warn(
            'Invalid field configuration: fields should be an array of strings, ' +
              `got ${typeof fields}`,
          );
          return;
        }
        processFields(fields, separator);
      }
    });
  };

  private handleRangeTimeValue = (originValues: Record<string, any>) => {
    const values = { ...originValues };
    const fieldMappingTime = this.state?.fieldMappingTime;

    this.handleMultiFields(values);
    if (!fieldMappingTime || !Array.isArray(fieldMappingTime)) {
      return values;
    }

    fieldMappingTime.forEach(
      ([field, [startTimeKey, endTimeKey], format = 'YYYY-MM-DD']) => {
        if (startTimeKey && endTimeKey && values[field] === null) {
          Reflect.deleteProperty(values, startTimeKey);
          Reflect.deleteProperty(values, endTimeKey);
        }

        if (!values[field]) {
          Reflect.deleteProperty(values, field);
          return;
        }

        const [startTime, endTime] = values[field];
        if (format === null) {
          values[startTimeKey] = startTime;
          values[endTimeKey] = endTime;
        } else if (isFunction(format)) {
          values[startTimeKey] = format(startTime, startTimeKey);
          values[endTimeKey] = format(endTime, endTimeKey);
        } else {
          const [startTimeFormat, endTimeFormat] = Array.isArray(format)
            ? format
            : [format, format];

          values[startTimeKey] = startTime
            ? formatDate(startTime, startTimeFormat)
            : undefined;
          values[endTimeKey] = endTime
            ? formatDate(endTime, endTimeFormat)
            : undefined;
        }
        Reflect.deleteProperty(values, field);
      },
    );
    return values;
  };

  private handleValueFormat = (originValues: Record<string, any>) => {
    const values = { ...originValues };
    const currentSchema = this.state?.schema ?? [];

    currentSchema.forEach((schema) => {
      if (!schema.valueFormat) {
        return;
      }

      const fieldName = schema.fieldName;
      const value = this.resolveValueByFieldName(values, fieldName);
      this.deleteValueByFieldName(values, fieldName);

      const formattedValue = schema.valueFormat(
        value,
        (key, nextValue) => {
          this.setValueByFieldName(values, key, nextValue);
        },
        values,
      );

      if (formattedValue !== undefined) {
        this.setValueByFieldName(values, fieldName, formattedValue);
      }
    });

    return values;
  };

  private hasValueByFieldName(values: Record<string, any>, fieldName: string) {
    const { pathSegments, rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      return Object.prototype.hasOwnProperty.call(values, rawKey);
    }
    if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
      return true;
    }

    let current: any = values;
    for (const segment of pathSegments) {
      if (current === undefined || current === null || !isObject(current)) {
        return false;
      }
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        return false;
      }
      current = current[segment];
    }
    return pathSegments.length > 0;
  }

  private processFields = (
    fields: string[],
    separator: string,
    originValues: Record<string, any>,
    transformFn: (value: any, separator: string) => any,
  ) => {
    fields.forEach((field) => {
      const value = originValues[field];
      if (value === undefined || value === null) {
        return;
      }
      originValues[field] = transformFn(value, separator);
    });
  };

  private readStoreState() {
    return ((this.store as any).state ??
      (this.store as any).get?.() ??
      {}) as VbenFormProps;
  }

  private resolveValueByFieldName(
    values: Record<string, any>,
    fieldName: string,
  ) {
    const { rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      return values[rawKey];
    }
    if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
      return values[fieldName];
    }
    return get(values, fieldName);
  }

  private setFieldValueIfChanged(
    form: FormActions,
    fieldName: string,
    value: any,
    options?: Recordable,
  ) {
    const currentValue = this.resolveValueByFieldName(
      form.state?.values ?? {},
      fieldName,
    );
    if (isEqual(currentValue, value)) {
      return false;
    }
    form.setFieldValue?.(fieldName, value, options);
    return true;
  }

  private setValueByFieldName(
    values: Record<string, any>,
    fieldName: string,
    value: any,
  ) {
    const { rawKey } = resolveFieldNamePath(fieldName);
    if (rawKey) {
      values[rawKey] = value;
      return;
    }
    set(values, fieldName, value);
  }

  private updateState() {
    const currentSchema = this.state?.schema ?? [];
    const prevSchema = this.prevState?.schema ?? [];
    if (currentSchema.length < prevSchema.length) {
      const currentFields = new Set(
        currentSchema.map((item) => item.fieldName),
      );
      const deletedSchema = prevSchema.filter(
        (item) => !currentFields.has(item.fieldName),
      );
      for (const schema of deletedSchema) {
        this.setFieldValueIfChanged(this.form, schema.fieldName, undefined, {
          touch: false,
        });
      }
    }
  }
}
