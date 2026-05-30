<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { ref } from 'vue';

import { Button, Card, message, Tabs } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});
const customActiveKey = ref('contacts-row-0');

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
      options: [
        { label: '业务联系人', value: 'business' },
        { label: '财务联系人', value: 'finance' },
        { label: '技术联系人', value: 'tech' },
      ],
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
] as VbenFormSchema[];

const [ArrayForm, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'submit', values };
    message.success('提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...contactChildren],
      component: 'Array',
      copyable: true,
      defaultValue: [
        {
          name: '张三',
          phone: '13800000000',
          remark: '默认联系人',
          type: 'business',
        },
      ],
      description: '对象数组字段，支持新增、复制、删除、排序和子字段校验。',
      fieldName: 'contacts',
      label: '联系人',
      maxRows: 5,
      minRows: 1,
      sortable: true,
    },
  ],
  wrapperClass: 'grid-cols-1',
});

const [CustomArrayForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = { action: 'custom-submit', values };
    message.success('自定义渲染数组表单提交成功');
  },
  schema: [
    {
      addButtonText: '新增联系人',
      children: [...contactChildren],
      childrenWrapperClass: 'grid grid-cols-1 gap-x-4 md:grid-cols-2',
      component: 'Array',
      copyable: true,
      defaultValue: [
        {
          name: '张三',
          phone: '13800000000',
          remark: '默认联系人',
          type: 'business',
        },
        {
          name: '李四',
          phone: '13900000000',
          remark: '通过 Tabs 自定义渲染',
          type: 'tech',
        },
      ],
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
</script>

<template>
  <div class="space-y-4">
    <Card title="Playground 数组子表单">
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
      <JsonPreview class="mt-4" title="数组子表单输出" :value="output" />
    </Card>

    <Card title="Playground 数组自定义渲染 / Tabs">
      <CustomArrayForm>
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
            <Tabs v-model:active-key="customActiveKey" type="card">
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
                  customActiveKey = `contacts-row-${rows.length}`;
                }
              "
            >
              新增联系人
            </Button>
          </div>
        </template>
      </CustomArrayForm>
    </Card>
  </div>
</template>
