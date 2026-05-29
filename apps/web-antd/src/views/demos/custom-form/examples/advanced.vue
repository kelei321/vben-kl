<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

const submittedValues = ref<Record<string, any>>({});

const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
    },
    fieldName: 'profile.name',
    label: '姓名',
    rules: z.string().min(1, '请输入姓名'),
  },
  {
    component: 'InputNumber',
    componentProps: {
      max: 120,
      min: 1,
      style: { width: '100%' },
    },
    fieldName: 'profile.age',
    label: '年龄',
    rules: z.number().min(1, '年龄必须大于 0'),
  },
  {
    component: 'RadioGroup',
    componentProps: {
      options: [
        { label: '前端', value: 'frontend' },
        { label: '后端', value: 'backend' },
        { label: '全栈', value: 'fullstack' },
      ],
    },
    fieldName: 'profile.direction',
    label: '方向',
    rules: 'selectRequired',
  },
  {
    component: 'CheckboxGroup',
    componentProps: {
      options: [
        { label: 'Vue', value: 'vue' },
        { label: 'React', value: 'react' },
        { label: 'Node', value: 'node' },
        { label: 'TypeScript', value: 'typescript' },
      ],
    },
    fieldName: 'skills',
    label: '技能',
    rules: z.array(z.string()).min(1, '至少选择一个技能'),
  },
  {
    component: 'TreeSelect',
    componentProps: {
      allowClear: true,
      treeData: [
        {
          children: [
            { title: '杭州', value: 'hangzhou' },
            { title: '宁波', value: 'ningbo' },
          ],
          title: '浙江',
          value: 'zhejiang',
        },
        {
          children: [
            { title: '广州', value: 'guangzhou' },
            { title: '深圳', value: 'shenzhen' },
          ],
          title: '广东',
          value: 'guangdong',
        },
      ],
      treeDefaultExpandAll: true,
    },
    fieldName: 'city',
    label: '城市',
    rules: 'selectRequired',
  },
  {
    component: 'Rate',
    componentProps: {
      allowHalf: true,
    },
    defaultValue: 3,
    fieldName: 'score',
    label: '评分',
  },
  {
    component: 'Switch',
    defaultValue: true,
    fieldName: 'notification.enabled',
    label: '消息通知',
  },
  {
    component: 'Textarea',
    componentProps: {
      allowClear: true,
      autoSize: { minRows: 3, maxRows: 6 },
      placeholder: '支持 formItemClass 跨列显示',
    },
    fieldName: 'description',
    formItemClass: 'md:cols-span-2',
    label: '个人简介',
    transform: {
      out: (value) => (typeof value === 'string' ? value.trim() : value),
    },
  },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 90,
  },
  handleSubmit: async (values) => {
    submittedValues.value = values;
    message.success('高级组件表单提交成功');
  },
  schema,
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function fillAdvancedValues() {
  await formApi.setValues({
    city: 'hangzhou',
    description: '  使用嵌套字段、数组字段和多种 Ant Design Vue 组件。  ',
    notification: {
      enabled: true,
    },
    profile: {
      age: 28,
      direction: 'frontend',
      name: '张三',
    },
    score: 4.5,
    skills: ['vue', 'typescript'],
  });
}
</script>

<template>
  <Card title="高级组件 / 嵌套字段 / value transform">
    <Form>
      <template #submit-before>
        <Button type="dashed" @click="fillAdvancedValues">填充高级示例</Button>
      </template>
    </Form>

    <div class="mt-4">
      <div class="mb-2 text-sm font-medium">提交结果</div>
      <pre
        class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >{{ JSON.stringify(submittedValues, null, 2) }}
      </pre>
    </div>
  </Card>
</template>
