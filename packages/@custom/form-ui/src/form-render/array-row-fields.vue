<script setup lang="ts">
import { cn } from '@vben-core/shared/utils';

import { injectRenderFormProps } from './context';
import FormField from './form-field.vue';

interface Props {
  arraySchema: any;
  cellClass?: string;
  rowState: any;
}

defineProps<Props>();

const formRenderProps = injectRenderFormProps();
const defaultWrapperClass = 'grid grid-cols-1 gap-x-4 md:grid-cols-2';
</script>

<template>
  <div :class="cn(arraySchema.childrenWrapperClass ?? defaultWrapperClass)">
    <template
      v-for="childState in rowState.children"
      :key="childState.fieldName"
    >
      <component
        :is="formRenderProps.form?.Field"
        v-if="formRenderProps.form?.Field"
        :name="childState.fieldName"
        :validators="childState.validators"
        v-slot="{ field: childField }"
      >
        <FormField
          v-bind="childState.schema"
          :class="cellClass"
          :common-component-props="arraySchema.commonComponentProps ?? {}"
          :field="childField"
        />
      </component>
    </template>
  </div>
</template>
