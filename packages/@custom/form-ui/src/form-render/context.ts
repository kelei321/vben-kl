import type { InjectionKey, Ref } from 'vue';

import type { BaseFormComponentType, FormRenderProps } from '../core/types';

import { computed, inject, provide } from 'vue';

const FORM_RENDER_PROPS_KEY = Symbol(
  'VbenCustomFormRenderProps',
) as InjectionKey<FormRenderProps>;

export function provideFormRenderProps(props: FormRenderProps) {
  provide(FORM_RENDER_PROPS_KEY, props);
}

export function injectRenderFormProps() {
  const value = inject(FORM_RENDER_PROPS_KEY);
  if (!value) {
    throw new Error('Vben form render props is not provided');
  }
  return value;
}

export function useFormContext() {
  const props = injectRenderFormProps();
  const componentBindEventMap = computed(
    () => props.componentBindEventMap ?? {},
  );
  const componentMap = computed(
    () => props.componentMap ?? {},
  ) as unknown as Ref<Record<BaseFormComponentType, any>>;
  const isVertical = computed(() => props.layout === 'vertical');

  return {
    componentBindEventMap,
    componentMap,
    isVertical,
  };
}
