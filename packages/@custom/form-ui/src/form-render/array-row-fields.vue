<script setup lang="ts">
import { cn } from '@vben-core/shared/utils';

import { injectRenderFormProps } from './context';
import FormField from './form-field.vue';

interface Props {
  arraySchema: any;
  rowState: any;
}

defineProps<Props>();

const formRenderProps = injectRenderFormProps();
</script>

<template>
  <div
    :class="
      cn(
        'grid grid-cols-1 gap-x-4 md:grid-cols-2',
        arraySchema.childrenWrapperClass,
      )
    "
  >
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
          :common-component-props="arraySchema.commonComponentProps ?? {}"
          :field="childField"
        />
      </component>
    </template>
  </div>
</template>
