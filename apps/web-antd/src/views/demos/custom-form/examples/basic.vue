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
      placeholder: '请输入用户名',
    },
    fieldName: 'username',
    label: '用户名',
    rules: z.string().min(1, '请输入用户名').max(20, '最多 20 个字符'),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        { label: '管理员', value: 'admin' },
        { label: '运营', value: 'operator' },
        { label: '访客', value: 'guest' },
      ],
      placeholder: '请选择角色',
    },
    fieldName: 'role',
    label: '角色',
    rules: 'selectRequired',
  },
  {
    component: 'Switch',
    defaultValue: true,
    fieldName: 'enabled',
    label: '启用状态',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '角色为管理员时必填',
    },
    clearWhenHidden: true,
    dependencies: {
      required: (values) => values.role === 'admin',
      rules: (values) =>
        values.role === 'admin'
          ? z.string().min(1, '管理员必须填写授权编码')
          : z.string().optional(),
      show: (values) => values.role === 'admin',
      triggerFields: ['role'],
    },
    fieldName: 'authCode',
    label: '授权编码',
  },
  {
    component: 'RangePicker',
    fieldName: 'dateRange',
    label: '有效期',
  },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 90,
  },
  fieldMappingTime: [['dateRange', ['startDate', 'endDate'], 'YYYY-MM-DD']],
  handleSubmit: async (values) => {
    submittedValues.value = values;
    message.success('提交成功，请查看下方输出');
  },
  schema,
  scrollToFirstError: true,
  showCollapseButton: true,
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function fillDemoValues() {
  await formApi.setValues({
    authCode: 'ROOT-2026',
    enabled: true,
    role: 'admin',
    username: 'kelei',
  });
}

async function validateOnly() {
  const result = await formApi.validate();
  message[result.valid ? 'success' : 'error'](
    result.valid ? '校验通过' : '校验失败，请检查错误提示',
  );
}
</script>

<template>
  <Card title="基础表单 / 动态联动 / Zod 校验">
    <Form>
      <template #submit-before>
        <Button type="dashed" @click="fillDemoValues">填充示例值</Button>
        <Button @click="validateOnly">只校验</Button>
      </template>
    </Form>

    <div class="mt-4">
      <div class="mb-2 text-sm font-medium">提交结果</div>
      <pre
        class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
      >
        {{ JSON.stringify(submittedValues, null, 2) }}
      </pre>
    </div>
  </Card>
</template>
