<script setup lang="ts">
import type { ExtendedFormApi, VbenFormProps } from './core/types';

import { onBeforeUnmount, watchEffect } from 'vue';

import { useForwardPropsEmits } from '@vben-core/composables';

import { useSelector } from '@tanstack/vue-store';

import { FormApi } from './core/form-api';
import VbenUseForm from './vben-use-form.vue';

interface Props extends VbenFormProps {}

const props = withDefaults(defineProps<Props>(), {
  actionWrapperClass: '',
  collapsed: false,
  collapsedRows: 1,
  commonConfig: () => ({}),
  handleReset: undefined,
  handleSubmit: undefined,
  layout: 'horizontal',
  resetButtonOptions: () => ({}),
  showCollapseButton: false,
  showDefaultActions: true,
  submitButtonOptions: () => ({}),
  wrapperClass: 'grid-cols-1',
});

const forward = useForwardPropsEmits(props);
const api = new FormApi(props);
const extendedApi = api as ExtendedFormApi;
extendedApi.useStore = (selector) => {
  return useSelector(api.store, selector ?? ((state) => state as never));
};

watchEffect(() => {
  api.setState({ ...props });
});

onBeforeUnmount(() => {
  api.unmount();
});
</script>

<template>
  <VbenUseForm v-bind="forward" :form-api="extendedApi">
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps"></slot>
    </template>
  </VbenUseForm>
</template>
