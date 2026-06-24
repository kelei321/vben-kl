import type {
  ExtendedFormApi,
  FieldDependencyState,
  FormActions,
  FormItemDependencies,
} from '../core/types';

import { computed, markRaw, ref, watch } from 'vue';

import { get, isBoolean, isFunction, isObject } from '@vben-core/shared/utils';

import { resolveFieldNamePath } from '../core/field-name';
import { isZodSchema } from '../zod/rules';

function serializeTriggerValue(value: any) {
  if (value === undefined) {
    return '__undefined__';
  }
  if (value === null) {
    return '__null__';
  }
  if (isObject(value) || Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function resolveValueByFieldName(
  values: Record<string, any>,
  fieldName: string,
) {
  const { rawKey } = resolveFieldNamePath(fieldName);
  if (rawKey) {
    return values[rawKey];
  }
  return get(values, fieldName);
}

function createDefaultDependencyState(): FieldDependencyState {
  return {
    componentProps: {},
    disabled: false,
    if: true,
    loading: false,
    required: false,
    rules: undefined,
    show: true,
  };
}

function shouldSyncSchema(fieldName: string) {
  return !fieldName.includes('[');
}

export default function useDependencies(
  fieldName: string,
  getDependencies: () => FormItemDependencies | undefined,
  getValues: () => Record<string, any>,
  formApi: FormActions,
  controller: ExtendedFormApi,
) {
  const state = ref<FieldDependencyState>(createDefaultDependencyState());
  const isTriggerRunning = ref(false);
  let effectId = 0;

  const triggerFieldSignature = computed(() => {
    const triggerFields = getDependencies()?.triggerFields ?? [];
    const values = getValues();
    return triggerFields
      .map((dep) => serializeTriggerValue(resolveValueByFieldName(values, dep)))
      .join('\u001F');
  });

  const resetConditionState = () => {
    state.value = createDefaultDependencyState();
  };

  watch(
    [triggerFieldSignature, () => getDependencies()],
    async ([signature, dependencies], oldValue) => {
      const oldSignature = oldValue?.[0];
      const currentEffectId = ++effectId;
      if (!dependencies || !dependencies?.triggerFields?.length) {
        return;
      }
      resetConditionState();
      const {
        componentProps,
        disabled,
        if: whenIf,
        required,
        rules,
        show,
        trigger,
        triggerOnMount = false,
      } = dependencies;

      const formValues = getValues();
      const nextState = { ...state.value };
      const schemaPatch: Record<string, any> = { fieldName };

      if (isFunction(whenIf)) {
        nextState.if = !!(await whenIf(formValues, formApi, controller));
        if (currentEffectId !== effectId) return;
        if (!nextState.if) {
          state.value = nextState;
          return;
        }
      } else if (isBoolean(whenIf)) {
        nextState.if = whenIf;
        if (!nextState.if) {
          state.value = nextState;
          return;
        }
      }

      if (isFunction(show)) {
        nextState.show = !!(await show(formValues, formApi, controller));
        if (currentEffectId !== effectId) return;
      } else if (isBoolean(show)) {
        nextState.show = show;
      }

      if (isFunction(componentProps)) {
        nextState.loading = true;
        state.value = { ...nextState };
        try {
          const resolvedComponentProps = await componentProps(
            formValues,
            formApi,
            controller,
          );
          if (currentEffectId !== effectId) return;
          nextState.componentProps = resolvedComponentProps;
        } catch (error) {
          if (currentEffectId !== effectId) return;
          nextState.componentProps = {};
          console.error(
            `[VbenForm] dependencies.componentProps failed: ${fieldName}`,
            error,
          );
        } finally {
          if (currentEffectId === effectId) {
            nextState.loading = false;
            state.value = { ...nextState };
          }
        }
      }

      if (isFunction(rules)) {
        const resolvedRules = await rules(formValues, formApi, controller);
        if (currentEffectId !== effectId) return;
        nextState.rules = isZodSchema(resolvedRules)
          ? markRaw(resolvedRules)
          : resolvedRules;
        schemaPatch.rules = nextState.rules;
      }

      if (isFunction(disabled)) {
        nextState.disabled = !!(await disabled(
          formValues,
          formApi,
          controller,
        ));
        if (currentEffectId !== effectId) return;
      } else if (isBoolean(disabled)) {
        nextState.disabled = disabled;
      }

      if (isFunction(required)) {
        nextState.required = !!(await required(
          formValues,
          formApi,
          controller,
        ));
        if (currentEffectId !== effectId) return;
        schemaPatch.required = nextState.required;
      }

      state.value = { ...nextState };

      if (Object.keys(schemaPatch).length > 1 && shouldSyncSchema(fieldName)) {
        controller.updateSchema?.([schemaPatch]);
      }

      if (!isFunction(trigger)) {
        return;
      }

      const isInitialRun = oldSignature === undefined;
      const signatureChanged = oldSignature !== signature;
      const shouldRunTrigger = isInitialRun ? triggerOnMount : signatureChanged;
      if (!shouldRunTrigger || isTriggerRunning.value) {
        return;
      }

      isTriggerRunning.value = true;
      try {
        await trigger(formValues, formApi, controller);
      } catch (error) {
        console.error(
          `[VbenForm] dependencies.trigger failed: ${fieldName}`,
          error,
        );
      } finally {
        isTriggerRunning.value = false;
      }
    },
    { immediate: true },
  );

  return {
    dynamicComponentProps: computed(() => state.value.componentProps),
    dynamicRules: computed(() => state.value.rules),
    isDisabled: computed(() => state.value.disabled),
    isIf: computed(() => state.value.if),
    isLoading: computed(() => state.value.loading),
    isRequired: computed(() => state.value.required),
    isShow: computed(() => state.value.show),
  };
}
