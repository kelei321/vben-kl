<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';

import type { VbenFormSchema } from '#/adapter/custom-form';

import { h, ref } from 'vue';

import { Button, Card, message, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});

function createRemoteOptions(keyword = '远程选项') {
  return new Promise<Array<{ label: string; value: string }>>((resolve) => {
    setTimeout(() => {
      resolve(
        Array.from({ length: 6 }).map((_, index) => ({
          label: `${keyword}-${index + 1}`,
          value: `${keyword}-${index + 1}`,
        })),
      );
    }, 350);
  });
}

function beforeUpload(file: UploadFile) {
  file.status = 'done';
  return false;
}

const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '请输入用户名',
    },
    fieldName: 'username',
    label: '字符串',
    rules: 'required',
  },
  {
    component: 'Input',
    description: '这是表单描述，支持 description 与 help。',
    fieldName: 'desc',
    help: 'help 会显示在 label 旁边，用于解释字段含义。',
    label: '字符串(带描述)',
  },
  {
    component: 'Select',
    asyncOptions: {
      immediate: true,
      request: () => createRemoteOptions('API'),
    },
    componentProps: {
      allowClear: true,
      showSearch: true,
    },
    fieldName: 'api',
    label: '远程下拉',
    rules: 'selectRequired',
  },
  {
    component: 'Select',
    asyncOptions: {
      dependsOn: ['username'],
      immediate: true,
      request: (values) => createRemoteOptions(values.username || '搜索'),
    },
    componentProps: {
      allowClear: true,
      mode: 'multiple',
      placeholder: '根据用户名模拟刷新 options',
    },
    fieldName: 'remoteSearch',
    label: '远程搜索',
    rules: z.array(z.string()).min(1, '请至少选择一项'),
  },
  {
    component: 'InputPassword',
    componentProps: {
      allowClear: true,
      placeholder: '请输入密码',
    },
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(6, '密码至少 6 位'),
  },
  {
    component: 'InputNumber',
    componentProps: {
      min: 1,
      placeholder: '请输入数字',
    },
    fieldName: 'number',
    label: '数字',
    rules: z
      .number({ invalid_type_error: '请输入数字' })
      .min(1, '数字不能小于 1'),
    suffix: () => '¥',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        { label: '选项1', value: '1' },
        { label: '选项2', value: '2' },
      ],
      showSearch: true,
    },
    fieldName: 'options',
    label: '下拉选',
    rules: 'selectRequired',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      optionType: 'button',
      options: [
        { label: '选项1', value: '1' },
        { label: '选项2', value: '2' },
      ],
    },
    fieldName: 'radioGroup',
    label: '单选组',
    rules: 'selectRequired',
  },
  {
    component: 'CheckboxGroup',
    componentProps: {
      options: [
        { label: 'Vue', value: 'vue' },
        { label: 'React', value: 'react' },
        { label: 'TypeScript', value: 'ts' },
      ],
    },
    fieldName: 'checkboxGroup',
    label: '多选组',
    rules: z.array(z.string()).min(1, '请至少选择一个'),
  },
  {
    component: 'Checkbox',
    defaultValue: false,
    fieldName: 'checkbox',
    label: '单选框',
    renderComponentContent: () => ({ default: () => '我已阅读协议' }),
    rules: z.boolean().refine((value) => value, '请先勾选协议'),
  },
  {
    component: 'Mentions',
    componentProps: {
      options: [
        { label: 'afc163', value: 'afc163' },
        { label: 'zombieJ', value: 'zombieJ' },
      ],
      rows: 2,
    },
    fieldName: 'mentions',
    label: '提及',
  },
  {
    component: 'Rate',
    fieldName: 'rate',
    label: '评分',
  },
  {
    component: 'Switch',
    defaultValue: true,
    fieldName: 'switch',
    label: '开关',
  },
  {
    component: 'DatePicker',
    componentProps: {
      class: 'w-full',
    },
    fieldName: 'datePicker',
    label: '日期选择框',
  },
  {
    component: 'RangePicker',
    componentProps: {
      class: 'w-full',
    },
    fieldName: 'rangePicker',
    label: '日期范围',
  },
  {
    component: 'TimePicker',
    componentProps: {
      class: 'w-full',
    },
    fieldName: 'timePicker',
    label: '时间选择框',
  },
  {
    component: 'TreeSelect',
    componentProps: {
      allowClear: true,
      treeData: [
        {
          label: '节点1',
          value: 'node-1',
          children: [
            { label: '节点1-1', value: 'node-1-1' },
            { label: '节点1-2', value: 'node-1-2' },
          ],
        },
        { label: '节点2', value: 'node-2' },
      ],
    },
    fieldName: 'treeSelect',
    label: '树选择',
    rules: 'selectRequired',
  },
  {
    component: 'Upload',
    componentProps: {
      beforeUpload,
      listType: 'picture-card',
      maxCount: 2,
      placeholder: h(Tag, { color: 'blue' }, () => '上传'),
    },
    fieldName: 'files',
    label: '上传',
  },
  {
    component: 'Textarea',
    componentProps: {
      allowClear: true,
      autoSize: { minRows: 3, maxRows: 6 },
    },
    fieldName: 'richEditor',
    formItemClass: 'md:col-span-2',
    label: '富文本替代',
  },
];

const [BaseForm, baseFormApi] = useVbenForm({
  commonConfig: {
    colon: true,
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  fieldMappingTime: [['rangePicker', ['startTime', 'endTime'], 'YYYY-MM-DD']],
  handleSubmit: (values) => {
    output.value = values;
    message.success('基础表单提交成功');
  },
  layout: 'horizontal',
  schema,
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function handleSetFormValue() {
  await baseFormApi.setValues({
    username: 'vben',
    desc: 'TanStack Form 示例',
    api: 'API-1',
    remoteSearch: ['搜索-1'],
    password: '123456',
    number: 99,
    options: '1',
    radioGroup: '1',
    checkboxGroup: ['vue', 'ts'],
    checkbox: true,
    mentions: '@afc163 hello',
    rate: 4,
    switch: true,
    datePicker: dayjs('2026-05-01'),
    rangePicker: [dayjs('2026-05-01'), dayjs('2026-05-07')],
    timePicker: dayjs('2026-05-01 12:30:00'),
    treeSelect: 'node-1-1',
    richEditor: '这里用 Textarea 替代 playground 中的 RichEditor。',
  });
}

async function handleValidate() {
  const result = await baseFormApi.validate();
  message[result.valid ? 'success' : 'error'](
    result.valid ? '校验通过' : '校验失败，请查看错误提示',
  );
}
</script>

<template>
  <Card title="Playground 基础表单">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="primary" @click="handleSetFormValue">设置表单值</Button>
      <Button @click="handleValidate">校验</Button>
    </div>
    <BaseForm />
    <JsonPreview class="mt-4" title="提交结果" :value="output" />
  </Card>
</template>
