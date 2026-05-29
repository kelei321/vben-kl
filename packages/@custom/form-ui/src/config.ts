import type { Component } from 'vue';

import type {
  BaseFormComponentType,
  DefineRuleFn,
  FormCommonConfig,
  VbenFormAdapterOptions,
} from './core/types';

import { h } from 'vue';

import {
  VbenButton,
  VbenCheckbox,
  Input as VbenInput,
  VbenInputPassword,
  VbenPinInput,
  VbenSelect,
} from '@vben-core/shadcn-ui';
import { globalShareState } from '@vben-core/shared/global-state';

import { configureAsyncOptions } from './core/async-options';

const DEFAULT_MODEL_PROP_NAME = 'modelValue';

export const DEFAULT_FORM_COMMON_CONFIG: FormCommonConfig = {
  disabledOnChangeListener: true,
  disabledOnInputListener: true,
  emptyStateValue: undefined,
};

export const COMPONENT_MAP: Record<BaseFormComponentType, Component> = {
  Array: h('div'),
  DefaultButton: h(VbenButton, { size: 'sm', variant: 'outline' }),
  PrimaryButton: h(VbenButton, { size: 'sm', variant: 'default' }),
  VbenCheckbox,
  VbenInput,
  VbenInputPassword,
  VbenPinInput,
  VbenSelect,
};

export const COMPONENT_BIND_EVENT_MAP: Partial<
  Record<BaseFormComponentType, string>
> = {
  VbenCheckbox: 'checked',
};

export const CUSTOM_RULES = new Map<string, DefineRuleFn>();

export function getCustomRule(name: string) {
  return CUSTOM_RULES.get(name);
}

export function setupVbenForm<
  T extends BaseFormComponentType = BaseFormComponentType,
>(options: VbenFormAdapterOptions<T> = {}) {
  const {
    asyncOptions,
    components: localComponents,
    config,
    defineRules,
  } = options;

  configureAsyncOptions(asyncOptions);

  const {
    disabledOnChangeListener = true,
    disabledOnInputListener = true,
    emptyStateValue = undefined,
  } = (config || {}) as FormCommonConfig;

  Object.assign(DEFAULT_FORM_COMMON_CONFIG, {
    disabledOnChangeListener,
    disabledOnInputListener,
    emptyStateValue,
  });

  if (defineRules) {
    for (const key of Object.keys(defineRules)) {
      const rule = defineRules[key];
      if (rule) {
        CUSTOM_RULES.set(key, rule);
      }
    }
  }

  const baseModelPropName =
    config?.baseModelPropName ?? DEFAULT_MODEL_PROP_NAME;
  const modelPropNameMap = config?.modelPropNameMap as
    | Record<BaseFormComponentType, string>
    | undefined;

  const components = {
    ...globalShareState.getComponents(),
    ...localComponents,
  } as Record<BaseFormComponentType, Component>;

  for (const component of Object.keys(components)) {
    const key = component as BaseFormComponentType;
    const componentImpl = components[key];
    if (!componentImpl) {
      continue;
    }
    COMPONENT_MAP[key] = componentImpl;

    if (baseModelPropName !== DEFAULT_MODEL_PROP_NAME) {
      COMPONENT_BIND_EVENT_MAP[key] = baseModelPropName;
    }

    if (modelPropNameMap?.[key]) {
      COMPONENT_BIND_EVENT_MAP[key] = modelPropNameMap[key];
    }
  }
}
