<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message, Switch } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const scrollEnabled = ref(true);
const output = ref<Record<string, any>>({});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit(values) {
    output.value = values;
    message.success('提交成功');
  },
  scrollToFirstError: scrollEnabled.value,
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'email',
      label: '邮箱',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'phone',
      label: '手机号',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'address',
      label: '地址',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'remark',
      label: '备注',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'company',
      label: '公司名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'position',
      label: '职位',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ],
      },
      fieldName: 'gender',
      label: '性别',
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function testValidateAndSubmit() {
  const result = await formApi.validateAndSubmitForm();
  output.value = { action: 'validateAndSubmitForm', result };
}

async function testValidate() {
  output.value = { action: 'validate', result: await formApi.validate() };
}

async function testValidateField() {
  output.value = {
    action: 'validateField(email)',
    result: await formApi.validateField('email'),
  };
}

function toggleScrollToError() {
  formApi.setState({ scrollToFirstError: scrollEnabled.value });
}

async function fillPartialData() {
  await formApi.setValues({
    username: 'vben',
    email: 'demo@vben.pro',
    phone: '13800138000',
  });
}
</script>

<template>
  <Card title="Playground 滚动到错误字段">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <span>开启滚动到首个错误：</span>
      <Switch v-model:checked="scrollEnabled" @change="toggleScrollToError" />
      <Button type="primary" @click="testValidateAndSubmit">
        validateAndSubmit
      </Button>
      <Button @click="testValidate">validate</Button>
      <Button @click="testValidateField">validateField(email)</Button>
      <Button @click="fillPartialData">填充部分数据</Button>
    </div>
    <div class="max-h-[360px] overflow-auto rounded border p-4">
      <Form />
    </div>
    <JsonPreview class="mt-4" title="输出" :value="output" />
  </Card>
</template>
