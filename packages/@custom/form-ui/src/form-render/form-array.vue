<script setup lang="ts">
import type {
  CustomRenderType,
  FormItemDependencies,
  FormSchema,
  Recordable,
} from '../core/types';

import { computed, nextTick, ref, watch } from 'vue';

import { Plus } from '@vben-core/icons';
import { Button, VbenRenderContent } from '@vben-core/shadcn-ui';
import { cloneDeep, cn, get, isFunction } from '@vben-core/shared/utils';

import { createDefaultItem } from '../zod/build-default-values';
import { buildFieldValidator, isZodSchema } from '../zod/rules';
import ArrayRowActions from './array-row-actions.vue';
import ArrayRowFields from './array-row-fields.vue';
import { injectRenderFormProps, useFormContext } from './context';

interface CachedDependencies {
  dependencies: FormItemDependencies;
  source: FormItemDependencies;
}

interface CachedChildState {
  fieldName: string;
  schema: FormSchema;
  source: FormSchema;
  validators: Recordable;
}

interface Props {
  arraySchema: any;
  field: any;
}

interface TableColumn {
  fieldName?: string;
  label?: CustomRenderType;
  required?: boolean;
  type?: 'actions' | 'field' | 'index';
  width?: number | string;
}

const props = defineProps<Props>();

useFormContext();
const formRenderProps = injectRenderFormProps();
const activeRowKey = ref('');

const arrayOnlySchemaFields = [
  'addButtonText',
  'arrayLayout',
  'children',
  'childrenWrapperClass',
  'component',
  'copyable',
  'copyExcludeFields',
  'copyValue',
  'defaultItem',
  'defaultValue',
  'description',
  'fieldName',
  'label',
  'layoutProps',
  'maxRows',
  'minRows',
  'removeButtonText',
  'rowClass',
  'sortable',
];
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
const childStateCache = new Map<string, CachedChildState>();

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
const layoutSlotName = computed(() => `${props.arraySchema.fieldName}-layout`);
const arrayLayout = computed(() => props.arraySchema.arrayLayout ?? 'card');

const tableLayoutProps = computed(
  () => props.arraySchema.layoutProps?.table ?? {},
);
const tabsLayoutProps = computed(
  () => props.arraySchema.layoutProps?.tabs ?? {},
);

const tableArraySchema = computed(() => ({
  ...props.arraySchema,
  childrenWrapperClass: 'grid grid-cols-1 gap-0',
}));

const rowSchemas = computed(() => {
  return rows.value.map((row, rowIndex) => ({
    children: (props.arraySchema.children ?? [])
      .filter((child: FormSchema) => child.component !== 'Array')
      .map((child: FormSchema) => resolveChildState(child, rowIndex)),
    row,
    rowClass: resolveRowClass(row, rowIndex),
    rowIndex,
    rowKey: getRowKey(row, rowIndex),
  }));
});

watch(
  () => [
    rows.value.length,
    props.arraySchema.children,
    props.arraySchema.childrenWrapperClass,
    props.arraySchema.commonComponentProps,
    props.arraySchema.disabled,
    props.arraySchema.labelWidth,
    props.arraySchema.wrapperClass,
  ],
  () => {
    childStateCache.clear();
    dependencyCache.clear();
  },
  { deep: true },
);

watch(
  rowSchemas,
  (items) => {
    if (items.length === 0) {
      activeRowKey.value = '';
      return;
    }
    if (!items.some((item) => item.rowKey === activeRowKey.value)) {
      activeRowKey.value = items[0]?.rowKey ?? '';
    }
  },
  { immediate: true },
);

const tableColumns = computed<TableColumn[]>(() => {
  const propsColumns = tableLayoutProps.value.columns;
  const showIndex = tableLayoutProps.value.showIndex !== false;
  const showActions = tableLayoutProps.value.showActions !== false;
  const childFields = props.arraySchema.children ?? [];
  const fieldColumns = (
    propsColumns && propsColumns.length > 0
      ? propsColumns
      : childFields
          .filter((child: FormSchema) => child.component !== 'Array')
          .map((child: FormSchema) => ({
            fieldName: child.fieldName,
            label: child.label,
          }))
  ).map((column: TableColumn) => {
    const child = findChildSchema(column.fieldName);
    return {
      ...column,
      label: column.label ?? child?.label ?? column.fieldName,
      required:
        column.required ?? (child ? isRequiredSchema(child) : undefined),
      type: 'field' as const,
      width: column.width ?? resolveDefaultColumnWidth(column.fieldName),
    };
  });

  return [
    ...(showIndex ? [{ label: '#', type: 'index' as const, width: 40 }] : []),
    ...fieldColumns,
    ...(showActions
      ? [{ label: '操作', type: 'actions' as const, width: 104 }]
      : []),
  ];
});

const tableGridTemplateColumns = computed(() =>
  tableColumns.value.map((column) => formatColumnWidth(column.width)).join(' '),
);
const tableMinWidth = computed(() =>
  formatLayoutSize(
    tableLayoutProps.value.minWidth,
    tableColumns.value.reduce(
      (total, column) => total + getColumnWidthValue(column.width),
      0,
    ),
  ),
);

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

  return `${props.arraySchema.fieldName}-row-${index}`;
}

function resolveArraySharedSchema() {
  const sharedSchema = { ...props.arraySchema };

  for (const field of arrayOnlySchemaFields) {
    Reflect.deleteProperty(sharedSchema, field);
  }

  return sharedSchema;
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

function resolveChildState(child: FormSchema, index: number) {
  const fieldName = `${props.arraySchema.fieldName}[${index}].${child.fieldName}`;
  const cacheKey = `${fieldName}:${child.component}`;
  const cached = childStateCache.get(cacheKey);

  if (cached?.source === child) {
    return cached;
  }

  const schema = resolveChildSchema(child, index);
  const childState = {
    fieldName: schema.fieldName,
    schema,
    source: child,
    validators: buildFieldValidator(schema),
  };
  childStateCache.set(cacheKey, childState);
  return childState;
}

function resolveChildSchema(child: FormSchema, index: number) {
  const formItemClass = isFunction(child.formItemClass)
    ? child.formItemClass
    : cn('min-w-0', child.formItemClass);

  return {
    ...resolveArraySharedSchema(),
    ...child,
    dependencies: resolveChildDependencies(child, index),
    disabled: child.disabled ?? props.arraySchema.disabled,
    fieldName: `${props.arraySchema.fieldName}[${index}].${child.fieldName}`,
    formItemClass,
    hideLabel: child.hideLabel ?? false,
    labelWidth: child.labelWidth ?? props.arraySchema.labelWidth,
    wrapperClass: child.wrapperClass ?? props.arraySchema.wrapperClass,
  };
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

async function handleTabsAdd() {
  if (!canAdd.value) {
    return;
  }
  handleAdd();
  await nextTick();
  const nextRow = rowSchemas.value[rowSchemas.value.length - 1];
  activeRowKey.value = nextRow?.rowKey ?? activeRowKey.value;
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

function handleTabsRemove(index: number) {
  const nextIndex = Math.max(0, Math.min(index, rows.value.length - 2));
  const nextRow = rowSchemas.value[nextIndex];
  activeRowKey.value = nextRow?.rowKey ?? '';
  handleRemove(index);
}

const arrayActions = {
  add: handleAdd,
  copy: handleCopy,
  move: handleMove,
  remove: handleRemove,
};

const tabsArrayActions = {
  add: handleTabsAdd,
  copy: handleCopy,
  move: handleMove,
  remove: handleTabsRemove,
};

function findChildSchema(fieldName?: string) {
  if (!fieldName) {
    return undefined;
  }
  return (props.arraySchema.children ?? []).find(
    (child: FormSchema) => child.fieldName === fieldName,
  );
}

function findChildState(rowState: any, fieldName?: string) {
  if (!fieldName) {
    return undefined;
  }
  return rowState.children.find((child: any) =>
    child.fieldName.endsWith(`.${fieldName}`),
  );
}

function formatColumnWidth(width?: number | string) {
  if (typeof width === 'number') {
    return `${width}px`;
  }
  return width ?? '160px';
}

function formatLayoutSize(
  value: number | string | undefined,
  fallback: number,
) {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value ?? `${fallback}px`;
}

function getColumnWidthValue(width?: number | string) {
  if (typeof width === 'number') {
    return width;
  }
  const value = Number.parseFloat(width ?? '');
  return Number.isFinite(value) ? value : 160;
}

function isRequiredSchema(schema: FormSchema) {
  if (schema.required) {
    return true;
  }
  if (schema.rules === 'required' || schema.rules === 'selectRequired') {
    return true;
  }
  if (isZodSchema(schema.rules)) {
    return !schema.rules.isOptional?.();
  }
  return false;
}

function resolveDefaultColumnWidth(fieldName?: string) {
  if (fieldName === 'remark') {
    return 208;
  }
  if (fieldName === 'phone') {
    return 144;
  }
  return 132;
}

function resolveTableCellRow(rowState: any, childState: any) {
  return {
    ...rowState,
    children: [childState],
  };
}

function resolveTabTitle(rowState: any) {
  const titleField = tabsLayoutProps.value.titleField;
  if (titleField) {
    const title = get(rowState.row ?? {}, titleField);
    if (title) {
      return String(title);
    }
  }
  return (
    tabsLayoutProps.value.fallbackTitle?.(rowState.rowIndex) ??
    `第 ${rowState.rowIndex + 1} 项`
  );
}

function isActiveTab(rowKey: string) {
  return activeRowKey.value === rowKey;
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

    <slot
      v-if="$slots[layoutSlotName]"
      :name="layoutSlotName"
      :actions="arrayActions"
      :array-row-actions="ArrayRowActions"
      :array-row-fields="ArrayRowFields"
      :array-schema="arraySchema"
      :can-add="canAdd"
      :can-remove="canRemove"
      :field="field"
      :is-disabled="isDisabled"
      :rows="rowSchemas"
      :rows-length="rows.length"
      :slots="$slots"
    ></slot>

    <template v-else-if="arrayLayout === 'table'">
      <div class="vben-array-table overflow-x-auto rounded-md border">
        <div class="w-full" :style="{ minWidth: tableMinWidth }">
          <div
            class="bg-muted/40 text-muted-foreground grid h-8 items-center border-b px-2 text-xs font-medium"
            :style="{ gridTemplateColumns: tableGridTemplateColumns }"
          >
            <div
              v-for="column in tableColumns"
              :key="`${column.type}-${column.fieldName ?? column.label}`"
            >
              <span v-if="column.required" class="text-destructive">*</span>
              <VbenRenderContent :content="column.label" />
            </div>
          </div>

          <div
            v-for="rowState in rowSchemas"
            :key="rowState.rowKey"
            class="grid items-center border-b px-2 last:border-b-0"
            :class="[
              rowState.rowClass,
              tableLayoutProps.compact === false ? 'py-2' : 'py-1',
            ]"
            :style="{ gridTemplateColumns: tableGridTemplateColumns }"
          >
            <template
              v-for="column in tableColumns"
              :key="`${rowState.rowKey}-${column.type}-${column.fieldName ?? column.label}`"
            >
              <div
                v-if="column.type === 'index'"
                class="text-muted-foreground text-xs"
              >
                {{ rowState.rowIndex + 1 }}
              </div>

              <component
                :is="ArrayRowFields"
                v-else-if="
                  column.type === 'field' &&
                  findChildState(rowState, column.fieldName)
                "
                :array-schema="tableArraySchema"
                cell-class="vben-array-table-cell"
                :row-state="
                  resolveTableCellRow(
                    rowState,
                    findChildState(rowState, column.fieldName),
                  )
                "
              />

              <ArrayRowActions
                v-else-if="column.type === 'actions'"
                :actions="arrayActions"
                :array-schema="arraySchema"
                :can-add="canAdd"
                :can-remove="canRemove"
                :is-disabled="isDisabled"
                :rows-length="rows.length"
                :row-state="rowState"
              />

              <div v-else></div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="arrayLayout === 'tabs'">
      <div class="space-y-3">
        <div class="border-border flex flex-wrap gap-1 border-b">
          <button
            v-for="rowState in rowSchemas"
            :key="rowState.rowKey"
            class="-mb-px px-3 py-1.5 text-sm"
            :class="{
              'border-border rounded-t-md border':
                tabsLayoutProps.type !== 'line',
              'bg-background border-b-background font-medium':
                tabsLayoutProps.type !== 'line' && isActiveTab(rowState.rowKey),
              'text-muted-foreground bg-muted/30':
                tabsLayoutProps.type !== 'line' &&
                !isActiveTab(rowState.rowKey),
              'border-primary text-primary border-b-2 font-medium':
                tabsLayoutProps.type === 'line' && isActiveTab(rowState.rowKey),
              'text-muted-foreground border-b-2 border-transparent':
                tabsLayoutProps.type === 'line' &&
                !isActiveTab(rowState.rowKey),
            }"
            type="button"
            @click="activeRowKey = rowState.rowKey"
          >
            {{ resolveTabTitle(rowState) }}
          </button>
        </div>

        <div
          v-for="rowState in rowSchemas"
          v-show="isActiveTab(rowState.rowKey)"
          :key="rowState.rowKey"
          class="space-y-3 rounded-md border p-3"
          :class="rowState.rowClass"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-muted-foreground text-xs">
              {{ resolveTabTitle(rowState) }}
            </div>
            <ArrayRowActions
              :actions="tabsArrayActions"
              :array-schema="arraySchema"
              :can-add="canAdd"
              :can-remove="canRemove"
              :is-disabled="isDisabled"
              :rows-length="rows.length"
              :row-state="rowState"
            />
          </div>

          <ArrayRowFields :array-schema="arraySchema" :row-state="rowState" />
        </div>

        <div class="flex justify-start">
          <Button
            :disabled="!canAdd"
            size="sm"
            type="button"
            variant="outline"
            @click="handleTabsAdd"
          >
            <Plus class="mr-1 size-4" />
            {{ arraySchema.addButtonText ?? '新增一行' }}
          </Button>
        </div>
      </div>
    </template>

    <template v-else>
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
          <slot
            :field="field"
            :index="rowState.rowIndex"
            :name="`${arraySchema.fieldName}-actions`"
            :row="rowState.row"
          >
            <ArrayRowActions
              :actions="arrayActions"
              :array-schema="arraySchema"
              :can-add="canAdd"
              :can-remove="canRemove"
              :is-disabled="isDisabled"
              :rows-length="rows.length"
              :row-state="rowState"
            />
          </slot>
        </div>

        <ArrayRowFields :array-schema="arraySchema" :row-state="rowState" />

        <slot
          :index="rowState.rowIndex"
          :name="`${arraySchema.fieldName}-row-after`"
          :row="rowState.row"
        ></slot>
      </div>
    </template>

    <div
      v-if="!$slots[layoutSlotName] && arrayLayout !== 'tabs'"
      class="flex justify-start"
    >
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

<style scoped>
.vben-array-table :deep(.vben-array-table-cell) {
  align-items: center;
  padding-bottom: 0;
}

.vben-array-table :deep(.vben-array-table-cell > .flex-auto) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.vben-array-table :deep(.vben-array-table-cell > .flex-auto > div) {
  width: 100%;
}

.vben-array-table
  :deep(.vben-array-table-cell > .flex-auto > .text-destructive.absolute) {
  position: static;
  margin-top: 2px;
  line-height: 16px;
}
</style>
