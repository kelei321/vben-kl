<script setup lang="ts">
import type {
  FormItemDependencies,
  FormSchema,
  Recordable,
} from '../core/types';

import { computed } from 'vue';

import { ArrowDown, ArrowUp, Copy, Plus, X } from '@vben-core/icons';
import { Button, VbenRenderContent } from '@vben-core/shadcn-ui';
import { cloneDeep, cn, get, isFunction } from '@vben-core/shared/utils';

import { createDefaultItem } from '../zod/build-default-values';
import { buildFieldValidator } from '../zod/rules';
import { injectRenderFormProps, useFormContext } from './context';
import FormField from './form-field.vue';

interface CachedDependencies {
  dependencies: FormItemDependencies;
  source: FormItemDependencies;
}

interface Props {
  arraySchema: any;
  field: any;
}

const props = defineProps<Props>();

useFormContext();
const formRenderProps = injectRenderFormProps();

const defaultCopyExcludeFields = [
  'id',
  '_id',
  'key',
  'rowKey',
  '_rowKey',
  'createdAt',
  'updatedAt',
];
const dependencyCache = new Map<string, CachedDependencies>();
const rowKeyMap = new WeakMap<object, string>();
let rowKeySeed = 0;

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

const defaultItemTemplate = computed(
  () =>
    props.arraySchema.defaultItem ??
    createDefaultItem(props.arraySchema.children ?? []),
);

const rowSchemas = computed(() => {
  return rows.value.map((row, rowIndex) => ({
    children: (props.arraySchema.children ?? [])
      .filter((child: FormSchema) => child.component !== 'Array')
      .map((child: FormSchema) => {
        const schema = resolveChildSchema(child, rowIndex);
        return {
          fieldName: schema.fieldName,
          schema,
          validators: buildFieldValidator(schema),
        };
      }),
    row,
    rowClass: resolveRowClass(row, rowIndex),
    rowIndex,
    rowKey: getRowKey(row, rowIndex),
  }));
});

function createItem() {
  return cloneDeep(defaultItemTemplate.value);
}

function createScopedValues(values: Recordable | undefined, index: number) {
  const formValues = values ?? {};
  const arrayValue = get(formValues, props.arraySchema.fieldName);
  const rowValue = get(formValues, `${props.arraySchema.fieldName}[${index}]`);

  return {
    ...formValues,
    $array: Array.isArray(arrayValue) ? arrayValue : [],
    $index: index,
    $row: rowValue ?? {},
  };
}

function getRowKey(row: Recordable, index: number) {
  const stableKey =
    row?.id ?? row?._id ?? row?.key ?? row?.rowKey ?? row?._rowKey;
  if (stableKey !== undefined && stableKey !== null && stableKey !== '') {
    return String(stableKey);
  }

  if (row && typeof row === 'object') {
    const cachedKey = rowKeyMap.get(row);
    if (cachedKey) {
      return cachedKey;
    }
    rowKeySeed += 1;
    const rowKey = `array-row-${rowKeySeed}`;
    rowKeyMap.set(row, rowKey);
    return rowKey;
  }

  return `array-row-${index}`;
}

function resolveChildDependencies(child: FormSchema, index: number) {
  const dependencies = child.dependencies;
  if (!dependencies) {
    return dependencies;
  }

  const cacheKey = `${child.fieldName}:${index}`;
  const cached = dependencyCache.get(cacheKey);
  if (cached?.source === dependencies) {
    return cached.dependencies;
  }

  const scope = dependencies.scope ?? 'row';
  const triggerFields =
    scope === 'form'
      ? dependencies.triggerFields
      : dependencies.triggerFields.map((field) =>
          resolveRowTriggerField(field, index),
        );

  const resolvedDependencies = {
    ...dependencies,
    componentProps: wrapDependencyCallback(dependencies.componentProps, index),
    disabled: wrapDependencyCallback(dependencies.disabled, index),
    if: wrapDependencyCallback(dependencies.if, index),
    required: wrapDependencyCallback(dependencies.required, index),
    rules: wrapDependencyCallback(dependencies.rules, index),
    show: wrapDependencyCallback(dependencies.show, index),
    trigger: wrapDependencyCallback(dependencies.trigger, index),
    triggerFields,
  };

  dependencyCache.set(cacheKey, {
    dependencies: resolvedDependencies,
    source: dependencies,
  });

  return resolvedDependencies;
}

function resolveChildSchema(child: FormSchema, index: number) {
  const formItemClass = isFunction(child.formItemClass)
    ? child.formItemClass
    : cn('min-w-0', child.formItemClass);

  const schema = {
    ...props.arraySchema,
    ...child,
    dependencies: resolveChildDependencies(child, index),
    disabled: child.disabled ?? props.arraySchema.disabled,
    fieldName: `${props.arraySchema.fieldName}[${index}].${child.fieldName}`,
    formItemClass,
    hideLabel: child.hideLabel ?? false,
    labelWidth: child.labelWidth ?? props.arraySchema.labelWidth,
    wrapperClass: child.wrapperClass ?? props.arraySchema.wrapperClass,
  };

  Reflect.deleteProperty(schema, 'children');
  return schema;
}

function resolveCopyValue(row: Recordable, index: number) {
  const copyValue = props.arraySchema.copyValue;
  const copied = isFunction(copyValue)
    ? cloneDeep(copyValue(row, index))
    : cloneDeep(row ?? {});
  const excludeFields = [
    ...defaultCopyExcludeFields,
    ...(props.arraySchema.copyExcludeFields ?? []),
  ];

  for (const field of excludeFields) {
    Reflect.deleteProperty(copied, field);
  }

  return copied;
}

function resolveRowClass(row: Recordable, index: number) {
  const rowClass = props.arraySchema.rowClass;
  return isFunction(rowClass) ? rowClass(row, index) : rowClass;
}

function resolveRowTriggerField(field: string, index: number) {
  if (field.startsWith('$root.')) {
    return field.slice('$root.'.length);
  }
  if (field.startsWith('$form.')) {
    return field.slice('$form.'.length);
  }
  if (field.startsWith(`${props.arraySchema.fieldName}[`)) {
    return field;
  }
  return `${props.arraySchema.fieldName}[${index}].${field}`;
}

function wrapDependencyCallback(callback: any, index: number) {
  if (!isFunction(callback)) {
    return callback;
  }

  return (values: Recordable, actions: any, controller: any) => {
    return callback(createScopedValues(values, index), actions, controller);
  };
}

function handleAdd() {
  if (canAdd.value) {
    props.field?.pushValue?.(createItem());
  }
}

function handleCopy(index: number) {
  if (canAdd.value) {
    props.field?.insertValue?.(
      index + 1,
      resolveCopyValue(rows.value[index] ?? {}, index),
    );
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
      v-for="rowState in rowSchemas"
      :key="rowState.rowKey"
      :class="
        cn(
          'border-border bg-card space-y-3 rounded-md border p-3',
          rowState.rowClass,
        )
      "
    >
      <slot
        :index="rowState.rowIndex"
        :name="`${arraySchema.fieldName}-row-before`"
        :row="rowState.row"
      ></slot>

      <div class="flex items-center justify-between gap-2">
        <div class="text-muted-foreground text-xs">
          {{ rowState.rowIndex + 1 }}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <slot
            :field="field"
            :index="rowState.rowIndex"
            :name="`${arraySchema.fieldName}-actions`"
            :row="rowState.row"
          >
            <Button
              v-if="arraySchema.sortable"
              aria-label="上移"
              :disabled="isDisabled || rowState.rowIndex === 0"
              size="icon"
              title="上移"
              type="button"
              variant="ghost"
              @click="handleMove(rowState.rowIndex, rowState.rowIndex - 1)"
            >
              <ArrowUp class="size-4" />
            </Button>
            <Button
              v-if="arraySchema.sortable"
              aria-label="下移"
              :disabled="isDisabled || rowState.rowIndex === rows.length - 1"
              size="icon"
              title="下移"
              type="button"
              variant="ghost"
              @click="handleMove(rowState.rowIndex, rowState.rowIndex + 1)"
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
              @click="handleCopy(rowState.rowIndex)"
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
              @click="handleRemove(rowState.rowIndex)"
            >
              <X class="size-4" />
            </Button>
          </slot>
        </div>
      </div>

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

      <slot
        :index="rowState.rowIndex"
        :name="`${arraySchema.fieldName}-row-after`"
        :row="rowState.row"
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
