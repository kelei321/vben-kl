<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

const searchValues = ref<Record<string, any>>({});

const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' },
  { label: '草稿', value: 'draft' },
];

const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '用户名 / 手机号 / 邮箱',
    },
    fieldName: 'keyword',
    label: '关键词',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: statusOptions,
      placeholder: '请选择状态',
    },
    fieldName: 'status',
    label: '状态',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        { label: '用户管理', value: 'user' },
        { label: '订单中心', value: 'order' },
        { label: '财务中心', value: 'finance' },
      ],
      placeholder: '请选择业务线',
    },
    fieldName: 'bizLine',
    label: '业务线',
  },
  {
    asyncOptions: {
      dependsOn: ['bizLine'],
      immediate: true,
      request: async (values) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const prefix = values.bizLine || 'common';
        return [
          { label: `${prefix}-管理员`, value: `${prefix}-admin` },
          { label: `${prefix}-运营`, value: `${prefix}-operator` },
          { label: `${prefix}-审核员`, value: `${prefix}-auditor` },
        ];
      },
    },
    component: 'Select',
    componentProps: {
      allowClear: true,
      placeholder: '随业务线变化的远程选项',
    },
    dependencies: {
      show: (values) => !!values.bizLine,
      triggerFields: ['bizLine'],
    },
    fieldName: 'owner',
    label: '负责人',
  },
  {
    component: 'RangePicker',
    fieldName: 'createdAt',
    label: '创建时间',
  },
  {
    component: 'Switch',
    defaultValue: false,
    fieldName: 'onlyMine',
    label: '只看我的',
  },
];

const [Form, formApi] = useVbenForm({
  collapsed: true,
  collapsedRows: 1,
  commonConfig: {
    labelWidth: 90,
  },
  fieldMappingTime: [
    ['createdAt', ['createdStart', 'createdEnd'], 'YYYY-MM-DD'],
  ],
  handleReset: async () => {
    searchValues.value = {};
    message.info('已重置搜索条件');
  },
  handleSubmit: async (values) => {
    searchValues.value = values;
    message.success('搜索参数已生成');
  },
  schema,
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
});

async function setCommonSearch() {
  await formApi.setValues({
    bizLine: 'user',
    keyword: 'admin',
    onlyMine: true,
    status: 'enabled',
  });
}
</script>

<template>
  <Card title="搜索表单 / 折叠展开 / asyncOptions">
    <Form>
      <template #submit-before>
        <Button type="dashed" @click="setCommonSearch">填充常用搜索</Button>
      </template>
    </Form>

    <div class="mt-4">
      <div class="mb-2 text-sm font-medium">搜索参数</div>
      <pre
        class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >{{ JSON.stringify(searchValues, null, 2) }}
      </pre>
    </div>
  </Card>
</template>
