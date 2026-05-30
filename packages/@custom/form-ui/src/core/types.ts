import type { QueryClient } from '@tanstack/vue-query';
import type { ZodTypeAny } from 'zod';

import type { Component, HtmlHTMLAttributes, Ref } from 'vue';

import type { VbenButtonProps } from '@vben-core/shadcn-ui';
import type { ClassType, MaybeComputedRef } from '@vben-core/typings';

import type { FormApi } from './form-api';

export type Recordable<T = any> = Record<string, T>;

export type FormLayout = 'horizontal' | 'inline' | 'vertical';

export type ValidateTrigger = 'blur' | 'change' | 'input' | 'submit';

export type BaseFormComponentType =
  | 'Array'
  | 'DefaultButton'
  | 'PrimaryButton'
  | 'VbenCheckbox'
  | 'VbenInput'
  | 'VbenInputPassword'
  | 'VbenPinInput'
  | 'VbenSelect'
  | (Record<never, never> & string);

type Breakpoints = '2xl:' | '3xl:' | '' | 'lg:' | 'md:' | 'sm:' | 'xl:';
type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type WrapperClassType =
  | `${Breakpoints}grid-cols-${GridCols}`
  | (Record<never, never> & string);

export type FormItemClassType =
  | `${Breakpoints}cols-end-${'auto' | GridCols}`
  | `${Breakpoints}cols-span-${'auto' | 'full' | GridCols}`
  | `${Breakpoints}cols-start-${'auto' | GridCols}`
  | (Record<never, never> & string)
  | WrapperClassType;

export type MaybeComponentPropKey =
  | 'options'
  | 'placeholder'
  | 'title'
  | keyof HtmlHTMLAttributes
  | (Record<never, never> & string);

export type MaybeComponentProps = { [K in MaybeComponentPropKey]?: any };

export interface FormActions {
  [key: string]: any;
  getAllErrors?: () => any;
  getFieldValue?: (fieldName: string) => any;
  handleSubmit?: (...args: any[]) => Promise<void> | void;
  reset?: (values?: Recordable, opts?: Recordable) => void;
  setFieldValue?: (fieldName: string, value: any, options?: any) => void;
  state?: any;
  validate?: (...args: any[]) => any | Promise<any>;
  validateField?: (...args: any[]) => any | Promise<any>;
}

export type CustomRenderType = (() => Component | string) | string;

export type CustomParamsRenderType =
  | ((
      value: Partial<Record<string, any>>,
      actions: FormActions,
    ) => Component | string)
  | string;

export type FormSchemaRuleType =
  | 'required'
  | 'selectRequired'
  | null
  | (Record<never, never> & string)
  | ZodTypeAny;

export type DefineRuleFn = (
  value: any,
  params: any[],
  ctx: { field: string; form: Recordable; label?: string },
) => boolean | string;

type FormItemDependenciesCondition<T = boolean | PromiseLike<boolean>> = (
  value: Partial<Record<string, any>>,
  actions: FormActions,
  controller: FormApi,
) => T;

type FormItemDependenciesConditionWithRules = (
  value: Partial<Record<string, any>>,
  actions: FormActions,
  controller: FormApi,
) => FormSchemaRuleType | PromiseLike<FormSchemaRuleType>;

type FormItemDependenciesConditionWithProps = (
  value: Partial<Record<string, any>>,
  actions: FormActions,
  controller: FormApi,
) => MaybeComponentProps | PromiseLike<MaybeComponentProps>;

export interface FormItemDependencies {
  componentProps?: FormItemDependenciesConditionWithProps;
  disabled?: boolean | FormItemDependenciesCondition;
  if?: boolean | FormItemDependenciesCondition;
  required?: FormItemDependenciesCondition;
  rules?: FormItemDependenciesConditionWithRules;
  /**
   * Dependency field scope. Array children use `row` by default so
   * `triggerFields: ['type']` resolves to the same row.
   */
  scope?: 'form' | 'row';
  show?: boolean | FormItemDependenciesCondition;
  trigger?: FormItemDependenciesCondition<void>;
  triggerFields: string[];
  /**
   * Whether to execute `trigger` during the initial dependency evaluation.
   * Condition/render state is still evaluated on mount; only the side-effect hook is skipped by default.
   */
  triggerOnMount?: boolean;
}

type ComponentProps =
  | ((
      value: Partial<Record<string, any>>,
      actions: FormActions,
    ) => MaybeComponentProps)
  | MaybeComponentProps;

export interface FormCommonConfig {
  collapsible?: boolean;
  colon?: boolean;
  componentProps?: ComponentProps;
  controlClass?: string;
  defaultCollapsed?: boolean;
  disabled?: boolean;
  disabledOnChangeListener?: boolean;
  disabledOnInputListener?: boolean;
  emptyStateValue?: null | undefined;
  formFieldProps?: Recordable;
  formItemClass?: (() => string) | string;
  hideLabel?: boolean;
  hideRequiredMark?: boolean;
  labelClass?: string;
  labelWidth?: number;
  modelPropName?: string;
  wrapperClass?: string;
}

type RenderComponentContentType = (
  value: Partial<Record<string, any>>,
  api: FormActions,
) => Record<string, any>;

type MappedComponentProps<P> =
  | ((
      value: Partial<Record<string, any>>,
      actions: FormActions,
    ) => P & Record<string, any>)
  | (P & Record<string, any>);

export type FormValueFormat = (
  value: any,
  setValue: (fieldName: string, value: any) => void,
  values: Record<string, any>,
) => any;

interface FormSchemaBody extends Omit<FormCommonConfig, 'componentProps'> {
  asyncOptions?: {
    clearValueOnDepsChange?: boolean;
    dependsOn?: string[];
    enabled?: ((values: Recordable) => boolean) | boolean;
    gcTime?: number;
    immediate?: boolean;
    keepPreviousData?: boolean;
    labelField?: string;
    queryKey?: ((values: Recordable) => unknown[]) | string | unknown[];
    request: (params: Recordable) => Promise<any[]>;
    staleTime?: number;
    valueField?: string;
  };
  clearWhenHidden?: boolean;
  defaultValue?: any;
  dependencies?: FormItemDependencies;
  description?: CustomRenderType;
  fieldName: string;
  help?: CustomParamsRenderType;
  hide?: boolean;
  label?: CustomRenderType;
  preserveValue?: boolean;
  renderComponentContent?: RenderComponentContentType;
  required?: boolean;
  requiredWhen?: FormItemDependenciesCondition;
  rules?: FormSchemaRuleType;
  suffix?: CustomRenderType;
  transform?: {
    in?: (value: any) => any;
    out?: (value: any, values: any) => any;
  };
  validateTrigger?: ValidateTrigger | ValidateTrigger[];
  valueFormat?: FormValueFormat;
  visibleWhen?: FormItemDependenciesCondition;
}

type FormSchemaDiscriminated<
  T extends BaseFormComponentType,
  P extends Record<string, any>,
> = {
  [K in Exclude<Extract<keyof P, T>, 'Array'>]: FormSchemaBody & {
    component: K;
    componentProps?: MappedComponentProps<P[K]>;
  };
}[Exclude<Extract<keyof P, T>, 'Array'>];

type FormSchemaFallback<T extends BaseFormComponentType> = FormSchemaBody & {
  component: Component | Exclude<T, 'Array'>;
  componentProps?: ComponentProps;
};

export interface FormArraySchema<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
> extends Omit<
  FormSchemaBody,
  'asyncOptions' | 'componentProps' | 'renderComponentContent' | 'transform'
> {
  addButtonText?: string;
  children: FormSchema<T, P>[];
  childrenWrapperClass?: string;
  component: 'Array';
  copyable?: boolean;
  copyExcludeFields?: string[];
  copyValue?: (row: Recordable, index: number) => Recordable;
  defaultItem?: Recordable;
  defaultValue?: Recordable[];
  maxRows?: number;
  minRows?: number;
  removeButtonText?: string;
  rowClass?: ((row: Recordable, index: number) => string) | string;
  sortable?: boolean;
}

export type FormSchema<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
> =
  | FormArraySchema<T, P>
  | FormSchemaDiscriminated<T, P>
  | FormSchemaFallback<T>;

export function isFormArraySchema(
  schema: FormSchema,
): schema is FormArraySchema {
  return (
    schema.component === 'Array' && Array.isArray((schema as any).children)
  );
}

export type HandleSubmitFn = (
  values: Record<string, any>,
) => Promise<void> | void;

export type HandleResetFn = (
  values: Record<string, any>,
) => Promise<void> | void;

export type FieldMappingTime = [
  string,
  [string, string],
  (
    | ((value: any, fieldName: string) => any)
    | [string, string]
    | null
    | string
  )?,
][];

export type ArrayToStringFields = Array<
  [string[], string?] | string | string[]
>;

export interface FormFieldProps<
  T extends BaseFormComponentType = BaseFormComponentType,
> extends FormSchemaBody {
  component: Component | T;
  componentProps?: ComponentProps;
}

export interface FormRenderProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
> {
  arrayToStringFields?: ArrayToStringFields;
  collapsed?: boolean;
  collapsedRows?: number;
  collapseTriggerResize?: boolean;
  commonConfig?: FormCommonConfig;
  compact?: boolean;
  componentBindEventMap?: Partial<Record<BaseFormComponentType, string>>;
  componentMap: Record<BaseFormComponentType, Component>;
  fieldMappingTime?: FieldMappingTime;
  form?: FormActions;
  formApi?: ExtendedFormApi;
  formValues?: Recordable;
  layout?: FormLayout;
  schema?: FormSchema<T, P>[];
  showCollapseButton?: boolean;
  wrapperClass?: WrapperClassType;
}

export interface ActionButtonOptions extends VbenButtonProps {
  [key: string]: any;
  content?: MaybeComputedRef<string>;
  show?: boolean;
}

export interface VbenFormProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
> extends Omit<
  FormRenderProps<T, P>,
  'componentBindEventMap' | 'componentMap' | 'form'
> {
  actionButtonsReverse?: boolean;
  actionLayout?: 'inline' | 'newLine' | 'rowEnd';
  actionPosition?: 'center' | 'left' | 'right';
  actionWrapperClass?: ClassType;
  arrayToStringFields?: ArrayToStringFields;
  fieldMappingTime?: FieldMappingTime;
  handleCollapsedChange?: (collapsed: boolean) => void;
  handleReset?: HandleResetFn;
  handleSubmit?: HandleSubmitFn;
  handleValuesChange?: (
    values: Record<string, any>,
    fieldsChanged: string[],
  ) => void;
  resetButtonOptions?: ActionButtonOptions;
  scrollToFirstError?: boolean;
  showDefaultActions?: boolean;
  submitButtonOptions?: ActionButtonOptions;
  submitOnChange?: boolean;
  submitOnEnter?: boolean;
  validateTrigger?: ValidateTrigger | ValidateTrigger[];
}

export type ExtendedFormApi = FormApi & {
  useStore: <T = NoInfer<VbenFormProps>>(
    selector?: (state: NoInfer<VbenFormProps>) => T,
  ) => Readonly<Ref<T>>;
};

export interface VbenFormAdapterOptions<
  T extends BaseFormComponentType = BaseFormComponentType,
> {
  asyncOptions?: {
    queryClient?: QueryClient;
    queryKeyPrefix?: string;
  };
  components?: Partial<Record<T, Component>>;
  config?: {
    baseModelPropName?: string;
    disabledOnChangeListener?: boolean;
    disabledOnInputListener?: boolean;
    emptyStateValue?: null | undefined;
    modelPropNameMap?: Partial<Record<T, string>>;
  };
  defineRules?: Partial<
    Record<'required' | 'selectRequired' | string, DefineRuleFn>
  >;
}

export interface FieldDependencyState {
  componentProps: MaybeComponentProps;
  disabled: boolean;
  if: boolean;
  loading: boolean;
  required: boolean;
  rules?: FormSchemaRuleType;
  show: boolean;
}
