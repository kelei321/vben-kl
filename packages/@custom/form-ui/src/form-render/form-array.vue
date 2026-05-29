<script setup lang="ts">
import type { FormSchema, Recordable } from '../core/types';

import { computed } from 'vue';

import { ArrowDown, ArrowUp, Copy, Plus, X } from '@vben-core/icons';
import { Button, VbenRenderContent } from '@vben-core/shadcn-ui';
import { cloneDeep, cn, get, isFunction } from '@vben-core/shared/utils';

import { createDefaultItem } from '../zod/build-default-values';
import { buildFieldValidator } from '../zod/rules';
import { injectRenderFormProps, useFormContext } from './context';
import FormField from './form-field.vue';

interface Props {
  arraySchema: any;
  field: any;
}

const props = defineProps<Props>();

useFormContext();
const formRenderProps = injectRenderFormProps();

const rows = computed<Recordable[]>(() => {
  const value =
    get(formRenderProps.formValues ?? {}, props.arraySchema.fieldName) ??
    props.field?.state?.value;
  return Array.isArray(value) ? value : [];
});

const isDisabled = computed(() => props.arraySchema.disabled);

const canAdd = computed(() => {
  return (
    !isDisabled.value &&
    (props.arraySchema.maxRows === undefined ||
      rows.value.length < props.arraySchema.maxRows)
  );
});

const canRemove = computed(() => {
  return (
    !isDisabled.value &&
    (props.arraySchema.minRows === undefined ||
      rows.value.length > props.arraySchema.minRows)
  );
});

function createItem() {
  return cloneDeep(
    props.arraySchema.defaultItem ??
      createDefaultItem(props.arraySchema.children),
  );
}

function resolveChildSchema(child: FormSchema, index: number) {
  if (child.component === 'Array') {
    console.warn(
      `[VbenForm] nested array schema is not supported: ${props.arraySchema.fieldName}.${child.fieldName}`,
    );
  }

  const formItemClass = isFunction(child.formItemClass)
    ? child.formItemClass
    : cn('min-w-0', child.formItemClass);

  return {
    ...props.arraySchema,
    ...child,
    disabled: child.disabled ?? props.arraySchema.disabled,
    fieldName: `${props.arraySchema.fieldName}[${index}].${child.fieldName}`,
    formItemClass,
    hideLabel: child.hideLabel ?? false,
    labelWidth: child.labelWidth ?? props.arraySchema.labelWidth,
    wrapperClass: child.wrapperClass ?? props.arraySchema.wrapperClass,
  };
}

function handleAdd() {
  if (canAdd.value) {
    props.field?.pushValue?.(createItem());
  }
}

function handleCopy(index: number) {
  if (canAdd.value) {
    props.field?.insertValue?.(index + 1, cloneDeep(rows.value[index] ?? {}));
  }
}

function handleMove(from: number, to: number) {
  if (!isDisabled.value && to >= 0 && to < rows.value.length) {
    props.field?.moveValue?.(from, to);
  }
}

function handleRemove(index: number) {
  if (canRemove.value) {
    props.field?.removeValue?.(index);
  }
}
</script>

<template>
  <div :class="cn('col-span-full w-full space-y-3', arraySchema.formItemClass)">
    <div v-if="arraySchema.label || arraySchema.description" class="space-y-1">
      <div v-if="arraySchema.label" class="text-sm font-medium">
        <VbenRenderContent :content="arraySchema.label" />
      </div>
      <div v-if="arraySchema.description" class="text-muted-foreground text-xs">
        <VbenRenderContent :content="arraySchema.description" />
      </div>
    </div>

    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="border-border bg-card space-y-3 rounded-md border p-3"
    >
      <slot
        :index="rowIndex"
        :name="`${arraySchema.fieldName}-row-before`"
        :row="row"
      ></slot>

      <div class="flex items-center justify-between gap-2">
        <div class="text-muted-foreground text-xs">
          {{ rowIndex + 1 }}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <slot
            :field="field"
            :index="rowIndex"
            :name="`${arraySchema.fieldName}-actions`"
            :row="row"
          >
            <Button
              v-if="arraySchema.sortable"
              aria-label="上移"
              :disabled="isDisabled || rowIndex === 0"
              size="icon"
              title="上移"
              type="button"
              variant="ghost"
              @click="handleMove(rowIndex, rowIndex - 1)"
            >
              <ArrowUp class="size-4" />
            </Button>
            <Button
              v-if="arraySchema.sortable"
              aria-label="下移"
              :disabled="isDisabled || rowIndex === rows.length - 1"
              size="icon"
              title="下移"
              type="button"
              variant="ghost"
              @click="handleMove(rowIndex, rowIndex + 1)"
            >
              <ArrowDown class="size-4" />
            </Button>
            <Button
              v-if="arraySchema.copyable"
              aria-label="复制"
              :disabled="!canAdd"
              size="icon"
              title="复制"
              type="button"
              variant="ghost"
              @click="handleCopy(rowIndex)"
            >
              <Copy class="size-4" />
            </Button>
            <Button
              :aria-label="arraySchema.removeButtonText ?? '删除'"
              :disabled="!canRemove"
              size="icon"
              :title="arraySchema.removeButtonText ?? '删除'"
              type="button"
              variant="ghost"
              @click="handleRemove(rowIndex)"
            >
              <X class="size-4" />
            </Button>
          </slot>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <template
          v-for="child in arraySchema.children"
          :key="`${rowIndex}-${child.fieldName}`"
        >
          <component
            :is="formRenderProps.form?.Field"
            v-if="formRenderProps.form?.Field && child.component !== 'Array'"
            :name="`${arraySchema.fieldName}[${rowIndex}].${child.fieldName}`"
            :validators="
              buildFieldValidator(resolveChildSchema(child, rowIndex))
            "
            v-slot="{ field: childField }"
          >
            <FormField
              v-bind="resolveChildSchema(child, rowIndex)"
              :common-component-props="arraySchema.commonComponentProps ?? {}"
              :field="childField"
            />
          </component>
        </template>
      </div>

      <slot
        :index="rowIndex"
        :name="`${arraySchema.fieldName}-row-after`"
        :row="row"
      ></slot>
    </div>

    <div class="flex justify-start">
      <Button
        :disabled="!canAdd"
        size="sm"
        type="button"
        variant="outline"
        @click="handleAdd"
      >
        <Plus class="mr-1 size-4" />
        {{ arraySchema.addButtonText ?? '新增一行' }}
      </Button>
    </div>
  </div>
</template>
