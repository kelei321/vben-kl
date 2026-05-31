<script setup lang="ts">
import type { FormFieldProps, MaybeComponentProps } from '../core/types';

import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue';

import { ChevronsDown, CircleAlert } from '@vben-core/icons';
import {
  Button,
  VbenCollapsible,
  VbenRenderContent,
  VbenTooltip,
} from '@vben-core/shadcn-ui';
import {
  cn,
  get,
  isEqual,
  isFunction,
  isObject,
  isString,
} from '@vben-core/shared/utils';

import { keepPreviousData, useQuery } from '@tanstack/vue-query';

import {
  buildAsyncOptionsQueryKey,
  getAsyncOptionsQueryClient,
  normalizeAsyncOptions,
  resolveAsyncOptionsDependsOnValues,
} from '../core/async-options';
import { resolveFieldNamePath } from '../core/field-name';
import { injectComponentRefMap } from '../use-form-context';
import { isZodSchema, normalizeRule } from '../zod/rules';
import { injectRenderFormProps, useFormContext } from './context';
import useDependencies from './dependencies';
import FormLabel from './form-label.vue';

interface Props extends FormFieldProps {
  commonComponentProps: MaybeComponentProps;
  field: any;
}

const props = defineProps<Props>();

const { componentBindEventMap, componentMap, isVertical } = useFormContext();
const formRenderProps = injectRenderFormProps();
const fieldComponentRef = useTemplateRef<HTMLInputElement>('fieldComponentRef');
const collapseOpen = ref(!props.defaultCollapsed);

const formApi = computed(() => formRenderProps.form);
const controller = computed(() => formRenderProps.formApi);
const values = computed<Record<string, any>>(
  () => formRenderProps.formValues ?? formRenderProps.form?.state?.values ?? {},
);
const compact = computed(() => formRenderProps.compact);

function getValueByFieldName(source: Record<string, any>, fieldName: string) {
  const { rawKey } = resolveFieldNamePath(fieldName);
  if (rawKey) {
    return source?.[rawKey];
  }
  if (Object.prototype.hasOwnProperty.call(source ?? {}, fieldName)) {
    return source[fieldName];
  }
  return get(source ?? {}, fieldName);
}

const fieldModelValue = computed(() => {
  const subscribedValue = getValueByFieldName(values.value, props.fieldName);
  return subscribedValue === undefined
    ? props.field?.state?.value
    : subscribedValue;
});

function getFormApi() {
  if (!formApi.value) {
    throw new Error('Form api is required in <FormField />');
  }
  return formApi.value;
}

function getController() {
  if (!controller.value) {
    throw new Error('formApi controller is required in <FormField />');
  }
  return controller.value;
}

const FieldComponent = computed(() => {
  const finalComponent = isString(props.component)
    ? componentMap.value[props.component]
    : props.component;
  if (!finalComponent) {
    console.warn(`Component ${String(props.component)} is not registered`);
  }
  return finalComponent;
});

const {
  dynamicComponentProps,
  dynamicRules,
  isDisabled,
  isIf,
  isLoading,
  isRequired,
  isShow,
} = useDependencies(
  props.fieldName,
  () => props.dependencies,
  () => values.value,
  getFormApi(),
  getController(),
);

const currentRules = computed(() =>
  dynamicRules.value === undefined ? props.rules : dynamicRules.value,
);
let validateEffectId = 0;

const visible = computed(() => !props.hide && isIf.value && isShow.value);

const hasControlledRequired = computed(() =>
  Object.prototype.hasOwnProperty.call(props.dependencies ?? {}, 'required'),
);

const asyncOptionsQueryKey = computed(() =>
  buildAsyncOptionsQueryKey(props.fieldName, values.value, props.asyncOptions),
);

const asyncOptionsDependsOnValues = computed(() =>
  resolveAsyncOptionsDependsOnValues(
    values.value,
    props.asyncOptions?.dependsOn ?? [],
  ),
);

const asyncOptionsEnabled = computed(() => {
  const config = props.asyncOptions;
  if (!config || config.immediate === false || !visible.value) {
    return false;
  }
  if (typeof config.enabled === 'function') {
    return !!config.enabled(values.value);
  }
  return config.enabled ?? true;
});

const asyncOptionsQuery = useQuery(
  computed(() => ({
    enabled: asyncOptionsEnabled.value,
    gcTime: props.asyncOptions?.gcTime,
    placeholderData: props.asyncOptions?.keepPreviousData
      ? keepPreviousData
      : undefined,
    queryFn: async () => props.asyncOptions?.request(values.value) ?? [],
    queryKey: asyncOptionsQueryKey.value,
    staleTime: props.asyncOptions?.staleTime,
  })),
  getAsyncOptionsQueryClient(),
);

const resolvedAsyncOptions = computed(() =>
  normalizeAsyncOptions(
    asyncOptionsQuery.isError.value ? [] : asyncOptionsQuery.data.value,
    props.asyncOptions?.labelField,
    props.asyncOptions?.valueField,
  ),
);

const shouldRequired = computed(() => {
  if (!visible.value) {
    return false;
  }
  if (hasControlledRequired.value) {
    return isRequired.value;
  }
  if (isRequired.value || props.required) {
    return true;
  }
  const rule = currentRules.value;
  if (!rule) {
    return false;
  }
  if (isString(rule)) {
    return ['required', 'selectRequired'].includes(rule);
  }
  if (isZodSchema(rule)) {
    return !rule.isOptional?.();
  }
  return false;
});

const labelStyle = computed(() => {
  return props.labelClass?.includes('w-') || isVertical.value
    ? {}
    : { width: `${props.labelWidth}px` };
});

const errors = computed(() => {
  const rawErrors = props.field?.state?.meta?.errors ?? [];
  return rawErrors
    .flatMap((item: any) => {
      if (!item) return [];
      if (typeof item === 'string') return [item];
      if (Array.isArray(item)) return item.map(String);
      if (item.message) return [String(item.message)];
      if (item.form) return Object.values(item.form).flat().map(String);
      if (item.fields) return Object.values(item.fields).flat().map(String);
      return [String(item)];
    })
    .filter(Boolean);
});
const isInValid = computed(() => errors.value.length > 0);
const firstError = computed(() => errors.value[0]);

const computedHelp = computed(() => {
  const helpContent = props.help;
  if (!helpContent) {
    return undefined;
  }
  return () =>
    isFunction(helpContent)
      ? helpContent(values.value, getFormApi())
      : helpContent;
});

const computedProps = computed<MaybeComponentProps>(() => {
  const finalComponentProps = isFunction(props.componentProps)
    ? props.componentProps(values.value, getFormApi())
    : props.componentProps;

  return {
    ...props.commonComponentProps,
    ...finalComponentProps,
    ...dynamicComponentProps.value,
    ...(props.asyncOptions
      ? {
          loading: asyncOptionsQuery.isFetching.value,
          options: resolvedAsyncOptions.value,
        }
      : {}),
    ...(isLoading.value ? { loading: true } : {}),
  };
});

watch(
  () => computedProps.value?.autofocus,
  (value) => {
    if (value === true) {
      nextTick(() => autofocus());
    }
  },
  { immediate: true },
);

watch(
  () => visible.value,
  (value) => {
    if (!value && props.clearWhenHidden && !props.preserveValue) {
      updateValue(undefined);
    }
  },
);

watch(
  () => asyncOptionsQuery.error.value,
  (error) => {
    if (!error) {
      return;
    }
    console.error(
      `[VbenForm] asyncOptions request failed: ${props.fieldName}`,
      error,
    );
  },
);

watch(
  asyncOptionsDependsOnValues,
  (_value, oldValue) => {
    if (!oldValue || !props.asyncOptions?.clearValueOnDepsChange) {
      return;
    }
    updateValue(undefined);
  },
  { deep: true },
);

watch(
  asyncOptionsQueryKey,
  (queryKey) => {
    if (props.asyncOptions) {
      controller.value?.registerOptionsQuery?.(props.fieldName, queryKey);
      return;
    }
    controller.value?.unregisterOptionsQuery?.(props.fieldName);
  },
  { deep: true, immediate: true },
);

const shouldDisabled = computed(
  () => isDisabled.value || props.disabled || computedProps.value?.disabled,
);

const customContentRender = computed(() => {
  if (!isFunction(props.renderComponentContent)) {
    return {};
  }
  return props.renderComponentContent(values.value, getFormApi());
});

const renderContentKey = computed(() => Object.keys(customContentRender.value));

function isEventObjectLike(value: any) {
  return isObject(value) && 'target' in value;
}

function getValidateTriggers() {
  const trigger = props.validateTrigger ?? 'blur';
  return Array.isArray(trigger) ? trigger : [trigger];
}

async function validateCurrentRule(value = fieldModelValue.value) {
  const currentEffectId = ++validateEffectId;
  const rule = normalizeRule(
    {
      ...props,
      required: shouldRequired.value,
      rules: currentRules.value,
    } as any,
    currentRules.value,
  );
  const result = await rule.safeParseAsync(value);
  if (currentEffectId !== validateEffectId) {
    return;
  }
  const nextErrors = result.success
    ? []
    : result.error.issues.map((issue) => issue.message).filter(Boolean);

  formApi.value?.setFieldMeta?.(props.fieldName, (prev: any) => ({
    ...prev,
    errorMap: nextErrors.length > 0 ? { onChange: nextErrors } : {},
    errors: nextErrors,
    isValid: nextErrors.length === 0,
  }));
}

function validateByTrigger(trigger: 'blur' | 'change' | 'input') {
  if (getValidateTriggers().includes(trigger)) {
    nextTick(() => validateCurrentRule());
  }
}

function handleBlur(event: FocusEvent) {
  props.field?.handleBlur?.(event);
  validateByTrigger('blur');
}

watch(
  () => currentRules.value,
  () => validateCurrentRule(),
);

function unwrapValue(value: any, bindEventField: string) {
  if (isEventObjectLike(value)) {
    return value?.target?.[bindEventField] ?? value?.target?.value ?? value;
  }
  return value;
}

const bindEventField = computed(
  () =>
    props.modelPropName ||
    (isString(props.component)
      ? componentBindEventMap.value?.[props.component]
      : undefined) ||
    'modelValue',
);

function updateValue(value: any) {
  const nextValue = unwrapValue(value, bindEventField.value);
  if (isEqual(nextValue, fieldModelValue.value)) {
    return;
  }
  props.field?.handleChange?.(nextValue);
  validateByTrigger('input');
  validateByTrigger('change');
}

function createComponentProps() {
  const modelName = bindEventField.value;
  const value = fieldModelValue.value;
  const binds: Record<string, any> = {
    ...computedProps.value,
    [modelName]: value === undefined ? props.emptyStateValue : value,
    [`onUpdate:${modelName}`]: updateValue,
    name: props.fieldName,
    onBlur: handleBlur,
  };

  if (!props.disabledOnChangeListener) {
    binds.onChange = (e: any) => updateValue(e);
  }
  if (!props.disabledOnInputListener) {
    binds.onInput = (e: any) => updateValue(e);
  }

  if (Reflect.has(computedProps.value, 'onChange')) {
    binds.onChange = computedProps.value.onChange;
  }
  if (Reflect.has(computedProps.value, 'onInput')) {
    binds.onInput = computedProps.value.onInput;
  }

  return binds;
}

function autofocus() {
  if (
    fieldComponentRef.value &&
    isFunction(fieldComponentRef.value.focus) &&
    document.activeElement !== fieldComponentRef.value
  ) {
    fieldComponentRef.value?.focus?.();
  }
}

const shouldCollapsible = computed(() => props.collapsible);
function toggleCollapsed() {
  collapseOpen.value = !collapseOpen.value;
}

const componentRefMap = injectComponentRefMap();
watch(fieldComponentRef, (componentRef) => {
  componentRefMap?.set(props.fieldName, componentRef);
});
onUnmounted(() => {
  if (componentRefMap?.has(props.fieldName)) {
    componentRefMap.delete(props.fieldName);
  }
  controller.value?.unregisterOptionsQuery?.(props.fieldName);
});

const exposedSlotProps = computed(() => ({
  field: props.field,
  errors: errors.value,
  isInValid: isInValid.value,
  disabled: shouldDisabled.value,
  ...createComponentProps(),
}));
</script>

<template>
  <div
    v-if="!hide && isIf"
    v-show="isShow"
    :class="{
      'form-valid-error': isInValid,
      'form-is-required': shouldRequired,
      'flex-col': isVertical,
      'flex-row items-center': !isVertical,
      'pb-4': !compact,
      'pb-2': compact,
    }"
    class="relative flex"
    v-bind="$attrs"
  >
    <FormLabel
      v-if="!hideLabel"
      :class="
        cn(
          'flex leading-6',
          {
            'mr-2 shrink-0 justify-end': !isVertical,
            'mb-1 flex-row': isVertical,
            'self-start': shouldCollapsible && !isVertical,
          },
          labelClass,
        )
      "
      :help="computedHelp"
      :colon="colon"
      :label="label"
      :required="shouldRequired && !hideRequiredMark"
      :style="labelStyle"
    >
      <template v-if="label">
        <VbenRenderContent :content="label" />
      </template>
      <template #extra>
        <Button
          class="ml-0.5"
          variant="icon"
          size="icon"
          @click.prevent="toggleCollapsed"
          v-if="shouldCollapsible"
        >
          <ChevronsDown
            :size="16"
            class="transition-transform"
            :class="{ 'rotate-180': !collapseOpen }"
          />
        </Button>
      </template>
    </FormLabel>
    <div class="flex-auto overflow-hidden p-px">
      <VbenCollapsible :show-trigger="false" v-model:open="collapseOpen">
        <template #collapsibleContent>
          <div :class="cn('relative flex w-full items-center', wrapperClass)">
            <div :class="cn('w-full', controlClass)">
              <slot v-bind="exposedSlotProps">
                <component
                  :is="FieldComponent"
                  ref="fieldComponentRef"
                  :class="{
                    'border-destructive hover:border-destructive/80 focus:border-destructive focus:shadow-[0_0_0_2px_rgba(255,38,5,0.06)]':
                      isInValid,
                  }"
                  v-bind="createComponentProps()"
                  :disabled="shouldDisabled"
                >
                  <template
                    v-for="name in renderContentKey"
                    :key="name"
                    #[name]="renderSlotProps"
                  >
                    <VbenRenderContent
                      :content="customContentRender[name]"
                      v-bind="{ ...renderSlotProps, formContext: field }"
                    />
                  </template>
                </component>
                <VbenTooltip
                  v-if="compact && isInValid"
                  :delay-duration="300"
                  side="left"
                >
                  <template #trigger>
                    <slot name="trigger">
                      <CircleAlert
                        :class="
                          cn(
                            'inline-flex size-5 cursor-pointer text-foreground/80 hover:text-foreground',
                          )
                        "
                      />
                    </slot>
                  </template>
                  <p class="text-destructive text-xs">{{ firstError }}</p>
                </VbenTooltip>
              </slot>
            </div>
            <div v-if="suffix" class="ml-1">
              <VbenRenderContent :content="suffix" />
            </div>
          </div>
        </template>
      </VbenCollapsible>

      <p v-if="description" class="text-muted-foreground mt-1 text-xs">
        <VbenRenderContent :content="description" />
      </p>

      <Transition name="slide-up" v-if="!compact">
        <p v-if="isInValid" class="text-destructive absolute mt-1 text-xs">
          {{ firstError }}
        </p>
      </Transition>
    </div>
  </div>
</template>
