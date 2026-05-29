import type { ComputedRef, InjectionKey } from 'vue';

import type { ExtendedFormApi, FormActions, VbenFormProps } from './core/types';

import { computed, inject, provide, unref, useSlots } from 'vue';

type ExtendFormProps = VbenFormProps & { formApi?: ExtendedFormApi };

const FORM_PROPS_KEY = Symbol('VbenCustomFormProps') as InjectionKey<
  [ComputedRef<ExtendFormProps> | ExtendFormProps, FormActions]
>;
const COMPONENT_REF_MAP_KEY = Symbol(
  'VbenCustomComponentRefMap',
) as InjectionKey<Map<string, unknown>>;

export function provideFormProps(
  value: [ComputedRef<ExtendFormProps> | ExtendFormProps, FormActions],
) {
  provide(FORM_PROPS_KEY, value);
}

export function injectFormProps() {
  const value = inject(FORM_PROPS_KEY);
  if (!value) {
    throw new Error('VbenFormProps is not provided');
  }
  return value;
}

export function provideComponentRefMap(value: Map<string, unknown>) {
  provide(COMPONENT_REF_MAP_KEY, value);
}

export function injectComponentRefMap() {
  return inject(COMPONENT_REF_MAP_KEY);
}

export function useDelegatedSlots() {
  const slots = useSlots();
  const delegatedSlots = computed(() => {
    const resultSlots: string[] = [];
    for (const key of Object.keys(slots)) {
      if (key !== 'default') {
        resultSlots.push(key);
      }
    }
    return resultSlots;
  });
  return { delegatedSlots };
}

export function getRootFormProps(
  props: ComputedRef<ExtendFormProps> | ExtendFormProps,
) {
  return unref(props);
}
