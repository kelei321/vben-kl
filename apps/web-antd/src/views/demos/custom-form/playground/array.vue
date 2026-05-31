<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { ref } from 'vue';

import { Button, Card, message, Tabs, Tag } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

type ContactFieldSchema = Exclude<VbenFormSchema, { component: 'Array' }>;

const output = ref<Record<string, any>>({});
const tabsActiveKey = ref('contacts-row-0');

const contactTypeOptions = [
  { label: '业务联系人', value: 'business' },
  { label: '财务联系人', value: 'finance' },
  { label: '技术联系人', value: 'tech' },
];

const contactTypeLabelMap: Record<string, string> = {
  business: '业务',
  finance: '财务',
  tech: '技术',
};

const defaultContacts = [
  {
    name: '张三',
    phone: '13800000000',
    remark: '默认联系人',
    type: 'business',
  },
  {
    name: '李四',
    phone: '13900000000',
    remark: '备用联系人',
    type: 'tech',
  },
];

const contactChildren = [
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '请输入联系人姓名',
    },
    fieldName: 'name',
    label: '姓名',
    rules: z.string().min(1, '请输入联系人姓名'),
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '请输入手机号',
    },
    fieldName: 'phone',
    label: '手机号',
    rules: z.string().min(1, '请输入手机号'),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: contactTypeOptions,
      placeholder: '请选择联系人类型',
    },
    fieldName: 'type',
    label: '类型',
    rules: 'selectRequired',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '请输入备注',
    },
    fieldName: 'remark',
    label: '备注',
  },
] as ContactFieldSchema[];

const tableContactChildren = contactChildren.map((item) => ({
  ...item,
  componentProps: {
    ...(typeof item.componentProps === 'object' ? item.componentProps : {}),
    size: 'small',
  },
  hideLabel: true,
  labelWidth: 0,
  wrapperClass: 'w-full',
})) as ContactFieldSchema[];

const linkageContactChildren = [
  ...contactChildren,
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '财务联系人必填税号',
    },
    dependencies: {
      required: (values: any) => values.$row?.type === 'finance',
      rules: (values: any) =>
        values.$row?.type === 'finance'
          ? z.string().min(1, '财务联系人必须填写税号')
          : z.string().optional(),
      triggerFields: ['type'],
    },
    fieldName: 'taxNo',
    label: '税号',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '技术联系人或严格模式必填邮箱',
    },
    dependencies: {
      required: (values: any) =>
        values.$row?.type === 'tech' || values.mode === 'strict',
      rules: (values: any) =>
        values.$row?.type === 'tech' || values.mode === 'strict'
          ? z.string().email('请输入正确的邮箱')
          : z.union([z.string().email('请输入正确的邮箱'), z.literal('')]),
      triggerFields: ['type', '$root.mode'],
    },
    fieldName: 'email',
    label: '邮箱',
  },
] as VbenFormSchema[];

const [ArrayForm, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'basic-submit', values };
    message.success('基础数组表单提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...contactChildren],
      component: 'Array',
      copyable: true,
      defaultValue: [defaultContacts[0]],
      description: '默认卡片布局，支持新增、复制、删除、排序和子字段校验。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 5,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

const [SlotArrayForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'slot-submit', values };
    message.success('局部插槽数组表单提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...contactChildren],
      component: 'Array',
      copyable: true,
      defaultValue: [...defaultContacts],
      description: '仅替换行头、操作区、行尾，字段布局仍走默认渲染。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 5,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

const [TabsArrayForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'tabs-submit', values };
    message.success('Tabs 自定义数组表单提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...contactChildren],
      childrenWrapperClass: 'grid grid-cols-1 gap-x-4 md:grid-cols-2',
      component: 'Array',
      copyable: true,
      defaultValue: [...defaultContacts],
      description: '通过 contacts-layout 插槽完全接管数组布局。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 5,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

const [TableArrayForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 0,
  },
  handleSubmit(values) {
    output.value = { action: 'table-submit', values };
    message.success('表格式数组表单提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...tableContactChildren],
      childrenWrapperClass: 'grid grid-cols-1',
      component: 'Array',
      copyable: true,
      defaultValue: [...defaultContacts],
      description: '适合多行快速录入的紧凑布局。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 8,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

const [LinkageArrayForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'linkage-submit', values };
    message.success('数组联动校验提交成功');
  },
  schema: [
    {
      component: 'Select',
      componentProps: {
        allowClear: false,
        options: [
          { label: '普通模式', value: 'normal' },
          { label: '严格模式', value: 'strict' },
        ],
      },
      defaultValue: 'normal',
      fieldName: 'mode',
      label: '校验模式',
    },
    {
      addButtonText: '新增联系人',
      children: linkageContactChildren,
      childrenWrapperClass: 'grid grid-cols-1 gap-x-4 md:grid-cols-3',
      component: 'Array',
      copyable: true,
      defaultValue: [
        {
          email: '',
          name: '王五',
          phone: '13700000000',
          remark: '联动校验示例',
          taxNo: '',
          type: 'finance',
        },
      ],
      description: '财务联系人税号必填，技术联系人或严格模式邮箱必填。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 5,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

async function handleApiAction(
  action:
    | 'appendArrayItem'
    | 'getValues'
    | 'insertArrayItem'
    | 'moveArrayItem'
    | 'removeArrayItem'
    | 'validate',
) {
  switch (action) {
    case 'appendArrayItem': {
      await formApi.appendArrayItem('contacts', {
        name: '李四',
        phone: '13900000000',
        remark: '通过 FormApi 追加',
        type: 'tech',
      });
      break;
    }
    case 'getValues': {
      output.value = { action, values: await formApi.getValues() };
      break;
    }
    case 'insertArrayItem': {
      await formApi.insertArrayItem('contacts', 0, {
        name: '王五',
        phone: '13700000000',
        remark: '插入到第一行',
        type: 'finance',
      });
      break;
    }
    case 'moveArrayItem': {
      await formApi.moveArrayItem('contacts', 0, 1);
      break;
    }
    case 'removeArrayItem': {
      await formApi.removeArrayItem('contacts', 0);
      break;
    }
    case 'validate': {
      output.value = { action, result: await formApi.validate() };
      break;
    }
  }

  if (action !== 'getValues' && action !== 'validate') {
    output.value = { action, values: await formApi.getValues() };
  }
}

function resolveTypeLabel(type: string) {
  return contactTypeLabelMap[type] ?? '未选择';
}

function resolveTableCellRow(rowState: any, childState: any) {
  return {
    ...rowState,
    children: [childState],
  };
}
</script>

<template>
  <div class="space-y-4">
    <Card title="Playground 数组子表单 / 默认布局">
      <div class="mb-4 flex flex-wrap gap-2">
        <Button type="primary" @click="handleApiAction('appendArrayItem')">
          appendArrayItem
        </Button>
        <Button @click="handleApiAction('insertArrayItem')">
          insertArrayItem
        </Button>
        <Button @click="handleApiAction('moveArrayItem')">moveArrayItem</Button>
        <Button @click="handleApiAction('removeArrayItem')">
          removeArrayItem
        </Button>
        <Button @click="handleApiAction('getValues')">getValues</Button>
        <Button @click="handleApiAction('validate')">validate</Button>
      </div>

      <ArrayForm />
    </Card>

    <Card title="Playground 数组局部插槽">
      <SlotArrayForm>
        <template #contacts-row-before="{ index, row }">
          <div class="mb-2 flex items-center justify-between">
            <div class="font-medium">联系人 {{ index + 1 }}</div>
            <Tag color="blue">{{ resolveTypeLabel(row.type) }}</Tag>
          </div>
        </template>

        <template #contacts-actions="{ field, index, row }">
          <div class="flex shrink-0 items-center gap-2">
            <Button
              size="small"
              @click="
                field.insertValue(index + 1, {
                  ...row,
                  name: `${row.name || '联系人'} 副本`,
                })
              "
            >
              复制
            </Button>
            <Button danger size="small" @click="field.removeValue(index)">
              删除
            </Button>
          </div>
        </template>

        <template #contacts-row-after="{ row }">
          <div class="text-muted-foreground text-xs">
            {{ row.name || '未填写姓名' }} / {{ row.phone || '未填写手机号' }} /
            {{ row.remark || '无备注' }}
          </div>
        </template>
      </SlotArrayForm>
    </Card>

    <Card title="Playground 数组自定义渲染 / Tabs">
      <TabsArrayForm>
        <template
          #contacts-layout="{
            actions,
            arraySchema,
            arrayRowActions,
            arrayRowFields,
            canAdd,
            canRemove,
            isDisabled,
            rows,
            rowsLength,
          }"
        >
          <div class="space-y-3">
            <Tabs v-model:active-key="tabsActiveKey" type="card">
              <Tabs.TabPane
                v-for="rowState in rows"
                :key="rowState.rowKey"
                :tab="rowState.row.name || `联系人 ${rowState.rowIndex + 1}`"
              >
                <div class="space-y-3 rounded-md border p-3">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-muted-foreground text-xs">
                      第 {{ rowState.rowIndex + 1 }} 位联系人
                    </div>
                    <component
                      :is="arrayRowActions"
                      :actions="actions"
                      :array-schema="arraySchema"
                      :can-add="canAdd"
                      :can-remove="canRemove"
                      :is-disabled="isDisabled"
                      :rows-length="rowsLength"
                      :row-state="rowState"
                    />
                  </div>
                  <component
                    :is="arrayRowFields"
                    :array-schema="arraySchema"
                    :row-state="rowState"
                  />
                </div>
              </Tabs.TabPane>
            </Tabs>

            <Button
              :disabled="!canAdd"
              type="dashed"
              @click="
                () => {
                  actions.add();
                  tabsActiveKey = `contacts-row-${rows.length}`;
                }
              "
            >
              新增联系人
            </Button>
          </div>
        </template>
      </TabsArrayForm>
    </Card>

    <Card title="Playground 数组自定义渲染 / 表格式紧凑录入">
      <TableArrayForm>
        <template
          #contacts-layout="{
            actions,
            arraySchema,
            arrayRowActions,
            arrayRowFields,
            canAdd,
            canRemove,
            isDisabled,
            rows,
            rowsLength,
          }"
        >
          <div class="space-y-3">
            <div class="overflow-x-auto rounded-md border">
              <div class="min-w-[936px]">
                <div
                  class="bg-muted/40 text-muted-foreground grid h-9 grid-cols-[48px_180px_180px_180px_minmax(220px,1fr)_128px] items-center border-b px-3 text-xs font-medium"
                >
                  <div>#</div>
                  <div>姓名</div>
                  <div>手机号</div>
                  <div>类型</div>
                  <div>备注</div>
                  <div>操作</div>
                </div>

                <div
                  v-for="rowState in rows"
                  :key="rowState.rowKey"
                  class="grid min-h-[68px] grid-cols-[48px_180px_180px_180px_minmax(220px,1fr)_128px] items-start border-b px-3 py-2 last:border-b-0"
                >
                  <div class="text-muted-foreground py-1.5 text-xs">
                    {{ rowState.rowIndex + 1 }}
                  </div>

                  <component
                    :is="arrayRowFields"
                    v-for="childState in rowState.children"
                    :key="childState.fieldName"
                    :array-schema="arraySchema"
                    :row-state="resolveTableCellRow(rowState, childState)"
                  />

                  <component
                    :is="arrayRowActions"
                    :actions="actions"
                    :array-schema="arraySchema"
                    :can-add="canAdd"
                    :can-remove="canRemove"
                    :is-disabled="isDisabled"
                    :rows-length="rowsLength"
                    :row-state="rowState"
                  />
                </div>
              </div>
            </div>

            <Button :disabled="!canAdd" type="dashed" @click="actions.add()">
              新增一行
            </Button>
          </div>
        </template>
      </TableArrayForm>
    </Card>

    <Card title="Playground 数组联动校验">
      <LinkageArrayForm />
    </Card>

    <JsonPreview title="数组表单输出" :value="output" />
  </div>
</template>
