<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import ArrayLinkage from './array-linkage.vue';
import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});

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
      children: [
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
      ],
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

    <ArrayLinkage />
  </div>
</template>
