<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});

function sleep(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 130,
  },
  handleSubmit(values) {
    output.value = values;
    message.success('校验规则示例提交成功');
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '必填' },
      fieldName: 'field1',
      label: '必填字段',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: '默认值',
      fieldName: 'field2',
      label: '默认值(必填)',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: '默认值',
      fieldName: 'field3',
      label: '默认值(非必填)',
      rules: z.string().optional(),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '至少输入 1 个字符' },
      fieldName: 'field31',
      label: '自定义信息',
      rules: z.string().min(1, { message: '最少输入 1 个字符' }),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入邮箱' },
      fieldName: 'email',
      label: '邮箱',
      rules: z.string().email('请输入正确的邮箱'),
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, placeholder: '请输入数字' },
      fieldName: 'number',
      label: '数字必填',
      rules: z
        .number({ invalid_type_error: '请输入数字' })
        .min(1, '数字不能小于 1'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '选项1', value: '1' },
          { label: '选项2', value: '2' },
        ],
      },
      fieldName: 'options',
      label: '下拉必选',
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ],
      },
      fieldName: 'radioGroup',
      label: '单选必选',
      rules: 'selectRequired',
    },
    {
      component: 'CheckboxGroup',
      componentProps: {
        options: [
          { label: 'Vue', value: 'vue' },
          { label: 'React', value: 'react' },
          { label: 'Svelte', value: 'svelte' },
        ],
      },
      fieldName: 'checkboxGroup',
      label: '多选必选',
      rules: z.array(z.string()).min(1, '请至少选择一个'),
    },
    {
      component: 'Checkbox',
      defaultValue: false,
      fieldName: 'checkbox',
      label: '协议确认',
      renderComponentContent: () => ({ default: () => '同意用户协议' }),
      rules: z.boolean().refine((value) => value, '请先勾选协议'),
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full' },
      fieldName: 'datePicker',
      label: '日期必选',
      rules: 'selectRequired',
    },
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full' },
      fieldName: 'rangePicker',
      label: '日期范围必选',
      rules: 'selectRequired',
    },
    {
      component: 'InputPassword',
      componentProps: { allowClear: true },
      fieldName: 'password',
      label: '密码',
      rules: z.string().min(6, '密码至少 6 位'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: 'blur 后触发字段校验' },
      fieldName: 'inputBlur',
      label: 'Blur 触发',
      rules: 'required',
      validateTrigger: 'blur',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '输入 admin 会异步失败',
      },
      fieldName: 'inputAsync',
      label: '异步校验',
      rules: z.string().superRefine(async (value, ctx) => {
        await sleep();
        if (value === 'admin') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'admin 已被占用',
          });
        }
      }),
    },
  ],
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function setValidValues() {
  await formApi.setValues({
    field1: '必填',
    field2: '默认值',
    field3: '默认值',
    field31: '1',
    email: 'demo@vben.pro',
    number: 2,
    options: '1',
    radioGroup: 'male',
    checkboxGroup: ['vue'],
    checkbox: true,
    password: '123456',
    inputBlur: 'blur',
    inputAsync: 'user001',
  });
}

async function validateOnly() {
  const result = await formApi.validate();
  output.value = result;
  message[result.valid ? 'success' : 'error'](
    result.valid ? '校验通过' : '校验失败',
  );
}
</script>

<template>
  <Card title="Playground 校验规则">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="primary" @click="setValidValues">填充合法值</Button>
      <Button @click="validateOnly">只校验</Button>
    </div>
    <Form />
    <JsonPreview class="mt-4" title="输出" :value="output" />
  </Card>
</template>
