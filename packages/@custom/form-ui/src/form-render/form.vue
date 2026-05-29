<script setup lang="ts">
import type {
  FormCommonConfig,
  FormRenderProps,
  FormSchema,
  MaybeComponentProps,
} from '../core/types';

import { computed } from 'vue';

import {
  cn,
  isFunction,
  mergeWithArrayOverride,
} from '@vben-core/shared/utils';

import { buildFieldValidator } from '../zod/rules';
import { provideFormRenderProps } from './context';
import { useExpandable } from './expandable';
import FormArray from './form-array.vue';
import FormField from './form-field.vue';

interface Props extends FormRenderProps {}

const props = withDefaults(
  defineProps<Props & { globalCommonConfig?: FormCommonConfig }>(),
  {
    collapsedRows: 1,
    commonConfig: () => ({}),
    globalCommonConfig: () => ({}),
    showCollapseButton: false,
    wrapperClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  },
);

const emits = defineEmits<{
  submit: [event: any];
}>();

const wrapperClass = computed(() => {
  const cls = ['flex'];
  if (props.layout === 'inline') {
    cls.push('flex-wrap gap-x-2');
  } else {
    cls.push(props.compact ? 'gap-x-2' : 'gap-x-4', 'flex-col grid');
  }
  return cn(...cls, props.wrapperClass);
});

provideFormRenderProps(props);

const { isCalculated, keepFormItemIndex, wrapperRef } = useExpandable(props);

const formCollapsed = computed(
  () => props.collapsed && isCalculated.value && !!wrapperRef.value,
);

const computedSchema = computed(
  (): (FormSchema & {
    commonComponentProps: MaybeComponentProps;
    formFieldProps: Record<string, any>;
  })[] => {
    const {
      colon = false,
      componentProps = {},
      controlClass = '',
      disabled,
      disabledOnChangeListener = true,
      disabledOnInputListener = true,
      emptyStateValue = undefined,
      formFieldProps = {},
      formItemClass = '',
      hideLabel = false,
      hideRequiredMark = false,
      labelClass = '',
      labelWidth = 100,
      modelPropName = '',
      wrapperClass = '',
    } = mergeWithArrayOverride(props.commonConfig, props.globalCommonConfig);

    return (props.schema || []).map((schema, index) => {
      const keepIndex = keepFormItemIndex.value;
      const hidden =
        props.showCollapseButton && !!formCollapsed.value && keepIndex
          ? keepIndex <= index
          : false;

      let resolvedSchemaFormItemClass = schema.formItemClass;
      if (isFunction(schema.formItemClass)) {
        try {
          resolvedSchemaFormItemClass = schema.formItemClass();
        } catch (error) {
          console.error('Error calling formItemClass function:', error);
          resolvedSchemaFormItemClass = '';
        }
      }

      return {
        colon,
        disabled,
        disabledOnChangeListener,
        disabledOnInputListener,
        emptyStateValue,
        hideLabel,
        hideRequiredMark,
        labelWidth,
        modelPropName,
        wrapperClass,
        ...schema,
        commonComponentProps: componentProps as MaybeComponentProps,
        componentProps:
          'componentProps' in schema ? schema.componentProps : undefined,
        controlClass: cn(controlClass, schema.controlClass),
        formFieldProps: {
          ...formFieldProps,
          ...schema.formFieldProps,
        },
        formItemClass: cn(
          'shrink-0',
          { hidden },
          formItemClass,
          resolvedSchemaFormItemClass,
        ),
        labelClass: cn(labelClass, schema.labelClass),
      };
    });
  },
);

function handleNativeSubmit(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  emits('submit', event);
  props.formApi?.validateAndSubmitForm();
}
</script>

<template>
  <form @submit="handleNativeSubmit">
    <div ref="wrapperRef" :class="wrapperClass">
      <template v-for="cSchema in computedSchema" :key="cSchema.fieldName">
        <component
          :is="form?.Field"
          v-if="form?.Field && cSchema.component === 'Array'"
          :name="cSchema.fieldName"
          mode="array"
          :validators="buildFieldValidator(cSchema)"
          v-slot="{ field }"
        >
          <FormArray :array-schema="cSchema" :field="field">
            <template
              v-for="(_, name) in $slots"
              :key="name"
              #[name]="slotProps"
            >
              <slot :name="name" v-bind="slotProps"></slot>
            </template>
          </FormArray>
        </component>
        <component
          :is="form?.Field"
          v-else-if="form?.Field"
          :name="cSchema.fieldName"
          :validators="buildFieldValidator(cSchema)"
          v-slot="{ field }"
        >
          <FormField
            v-bind="cSchema"
            :class="cSchema.formItemClass"
            :field="field"
            :rules="cSchema.rules"
          >
            <template #default="slotProps">
              <slot v-bind="slotProps" :name="cSchema.fieldName"> </slot>
            </template>
          </FormField>
        </component>
      </template>
      <slot :shapes="computedSchema"></slot>
    </div>
  </form>
</template>
