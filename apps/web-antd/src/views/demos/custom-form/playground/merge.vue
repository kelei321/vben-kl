<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message, Steps } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const currentTab = ref(0);
const output = ref<Record<string, any> | Record<string, any>[]>([]);
const stepsItems = [{ title: '表单1' }, { title: '表单2' }];

function onFirstSubmit(values: Record<string, any>) {
  message.success(`form1 values: ${JSON.stringify(values)}`);
  currentTab.value = 1;
}

function onSecondReset() {
  currentTab.value = 0;
}

function onSecondSubmit(values: Record<string, any>) {
  message.success(`form2 values: ${JSON.stringify(values)}`);
}

const [FirstForm, firstFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 110,
  },
  handleSubmit: onFirstSubmit,
  layout: 'horizontal',
  resetButtonOptions: {
    show: false,
  },
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入' },
      fieldName: 'formFirst',
      label: '表单1字段',
      rules: 'required',
    },
  ],
  submitButtonOptions: {
    content: '下一步',
  },
  wrapperClass: 'grid-cols-1',
});

const [SecondForm, secondFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 110,
  },
  handleReset: onSecondReset,
  handleSubmit: onSecondSubmit,
  layout: 'horizontal',
  resetButtonOptions: {
    content: '上一步',
  },
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入' },
      fieldName: 'formSecond',
      label: '表单2字段',
      rules: 'required',
    },
  ],
  wrapperClass: 'grid-cols-1',
});

async function handleMergeSubmit() {
  const result = await firstFormApi.merge(secondFormApi).submitAllForm();
  output.value = result ?? {};
  if (result) {
    message.success(`合并结果：${JSON.stringify(result)}`);
  }
}
</script>

<template>
  <Card title="Playground 多表单合并">
    <Steps :current="currentTab" :items="stepsItems" class="mb-4" />

    <FirstForm v-show="currentTab === 0" />
    <SecondForm v-show="currentTab === 1" />

    <div class="mt-4 flex flex-wrap gap-2">
      <Button type="primary" @click="handleMergeSubmit">
        合并提交两个表单
      </Button>
    </div>

    <JsonPreview class="mt-4" title="合并结果" :value="output" />
  </Card>
</template>
