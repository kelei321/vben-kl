import type {
  BaseFormComponentType,
  ExtendedFormApi,
  VbenFormProps,
} from './core/types';

import { defineComponent, h, isReactive, onBeforeUnmount, watch } from 'vue';

import { isEqual } from '@vben-core/shared/utils';

import { useSelector } from '@tanstack/vue-store';

import { FormApi } from './core/form-api';
import VbenUseForm from './vben-use-form.vue';

export function useVbenForm<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
>(options: VbenFormProps<T, P>) {
  const IS_REACTIVE = isReactive(options);
  const api = new FormApi(options as unknown as VbenFormProps);
  const extendedApi: ExtendedFormApi = api as never;

  extendedApi.useStore = (selector) => {
    return useSelector(api.store, selector ?? ((state) => state as never));
  };

  const Form = defineComponent(
    (props: VbenFormProps, { attrs, slots }) => {
      onBeforeUnmount(() => {
        api.unmount();
      });
      watch(
        () => ({ ...props, ...attrs }),
        (nextState) => {
          if (!isEqual(api.getState(), { ...api.getState(), ...nextState })) {
            api.setState(nextState);
          }
        },
        { deep: true, immediate: true },
      );
      return () =>
        h(VbenUseForm, { ...props, ...attrs, formApi: extendedApi }, slots);
    },
    {
      name: 'VbenCustomUseForm',
      inheritAttrs: false,
    },
  );

  if (IS_REACTIVE) {
    watch(
      () => options.schema,
      () => {
        api.setState({ schema: options.schema as never });
      },
      { immediate: true },
    );
  }

  return [Form, extendedApi] as const;
}
