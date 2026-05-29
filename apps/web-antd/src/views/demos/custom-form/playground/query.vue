<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});

function onSubmit(values: Record<string, any>) {
  output.value = values;
  message.success('查询成功');
}

const commonConfig = {
  componentProps: {
    class: 'w-full',
  },
  labelWidth: 90,
};

const commonOptions = [
  { label: '选项1', value: '1' },
  { label: '选项2', value: '2' },
];

const querySchema = [
  {
    component: 'Input',
    componentProps: { allowClear: true, placeholder: '请输入用户名' },
    fieldName: 'username',
    label: '用户名',
  },
  {
    component: 'InputPassword',
    componentProps: { allowClear: true, placeholder: '请输入密码' },
    fieldName: 'password',
    label: '密码',
  },
  {
    component: 'InputNumber',
    componentProps: { placeholder: '请输入数字' },
    fieldName: 'number',
    label: '数字',
    suffix: () => '¥',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: commonOptions,
      showSearch: true,
    },
    fieldName: 'options',
    label: '下拉选',
  },
  {
    component: 'DatePicker',
    componentProps: { class: 'w-full' },
    fieldName: 'datePicker',
    label: '日期',
  },
  {
    component: 'Switch',
    fieldName: 'enabled',
    label: '启用',
  },
];

const [QueryForm] = useVbenForm({
  collapsed: false,
  commonConfig,
  handleSubmit: onSubmit,
  layout: 'horizontal',
  schema: querySchema,
  showCollapseButton: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
});

const [InlineForm] = useVbenForm({
  commonConfig,
  handleSubmit: onSubmit,
  layout: 'inline',
  schema: querySchema.slice(0, 4),
  wrapperClass: 'grid-cols-1',
});

const [CollapsedRowsForm] = useVbenForm({
  collapsed: true,
  collapsedRows: 2,
  commonConfig,
  handleSubmit: onSubmit,
  layout: 'horizontal',
  schema: Array.from({ length: 10 }).map((_, index) => ({
    component: 'Input',
    componentProps: { allowClear: true, placeholder: `字段${index + 1}` },
    fieldName: `field${index + 1}`,
    label: `字段${index + 1}`,
  })),
  showCollapseButton: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
});

const [NoActionForm, noActionApi] = useVbenForm({
  commonConfig,
  handleSubmit: onSubmit,
  layout: 'horizontal',
  schema: querySchema.slice(0, 5),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
});

async function submitNoActionForm() {
  await noActionApi.validateAndSubmitForm();
}

async function resetNoActionForm() {
  await noActionApi.resetForm();
}
</script>

<template>
  <div class="space-y-4">
    <Card title="查询表单 / 默认操作按钮 / 折叠展开">
      <QueryForm />
    </Card>

    <Card title="行内查询表单">
      <InlineForm />
    </Card>

    <Card title="指定 collapsedRows 的查询表单">
      <CollapsedRowsForm />
    </Card>

    <Card title="隐藏默认操作按钮，自定义查询区">
      <div class="mb-4 flex flex-wrap gap-2">
        <Button type="primary" @click="submitNoActionForm">查询</Button>
        <Button @click="resetNoActionForm">重置</Button>
      </div>
      <NoActionForm />
    </Card>

    <JsonPreview title="最近一次查询结果" :value="output" />
  </div>
</template>
