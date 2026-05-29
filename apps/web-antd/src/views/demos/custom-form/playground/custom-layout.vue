<script lang="ts" setup>
import { h } from 'vue';

import { Card, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

const [CustomLayoutForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 110,
  },
  handleSubmit() {
    message.success('自定义布局表单提交成功');
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Select',
      componentProps: {
        options: [{ label: '选项1', value: '1' }],
      },
      fieldName: 'field1',
      label: '第一列',
    },
    {
      component: 'TreeSelect',
      componentProps: {
        treeData: [{ label: '节点1', value: '1' }],
      },
      fieldName: 'field2',
      label: '第二列',
    },
    {
      component: 'Mentions',
      fieldName: 'field3',
      label: '第三列',
    },
    {
      component: 'Input',
      fieldName: 'field4',
      label: '普通输入',
    },
    {
      component: 'InputNumber',
      fieldName: 'field5',
      formItemClass: 'col-start-3',
      label: '前面空一列',
    },
    {
      component: 'Divider',
      fieldName: '_divider',
      formItemClass: 'col-span-3',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () =>
          h('div', { class: 'text-muted-foreground' }, '分割线 / col-span-3'),
      }),
    },
    {
      component: 'Textarea',
      componentProps: {
        autoSize: { minRows: 3, maxRows: 6 },
      },
      fieldName: 'field6',
      formItemClass: 'col-span-3 items-baseline',
      label: '占满三列',
    },
    {
      component: 'Input',
      fieldName: 'field7',
      formItemClass: 'col-span-2 col-start-2',
      label: '占满两列',
    },
    {
      component: 'Input',
      fieldName: 'field8',
      formItemClass: 'col-start-2',
      label: '左右留空',
    },
    {
      component: 'InputPassword',
      fieldName: 'field9',
      label: '密码',
    },
  ],
  wrapperClass: 'grid-cols-3',
});
</script>

<template>
  <Card title="Playground 自定义布局">
    <CustomLayoutForm />
  </Card>
</template>
