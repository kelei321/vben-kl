<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { Button, Card, message, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const transformedValues = ref<Record<string, any>>({});
const liveValues = ref<Record<string, any>>({});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  handleSubmit,
  handleValuesChange: async () => {
    await syncPreviewValues();
  },
  schema: [
    {
      component: 'RangePicker',
      componentProps: { class: 'w-full' },
      fieldName: 'reportRange',
      help: '通过 valueFormat 拆分为 startTime / endTime，并移除原字段',
      label: '统计时间范围',
      valueFormat(value, setValue) {
        setValue('startTime', value?.[0]?.valueOf());
        setValue('endTime', value?.[1]?.valueOf());
      },
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full' },
      fieldName: 'deadline',
      help: '直接 return 时间戳，保留原字段名',
      label: '截止时间',
      valueFormat(value) {
        return value?.valueOf();
      },
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入关键字',
      },
      fieldName: 'keyword',
      label: '关键字',
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const liveTag = computed(() =>
  Object.keys(liveValues.value).length > 0 ? '已同步' : '暂无数据',
);

async function handleInspectValues() {
  await syncPreviewValues();
  message.success('已刷新 getValues 输出');
}

async function handleSetExampleValue() {
  await formApi.setValues({
    deadline: dayjs('2026-04-12 18:30:00'),
    keyword: 'TanStack Form',
    reportRange: [dayjs('2026-04-01 00:00:00'), dayjs('2026-04-12 23:59:59')],
  });
  await syncPreviewValues();
}

function handleSubmit(values: Record<string, any>) {
  transformedValues.value = values;
  message.success('提交后已应用 valueFormat');
}

async function syncPreviewValues(values?: Record<string, any>) {
  liveValues.value = values ?? (await formApi.getValues());
}

onMounted(async () => {
  await nextTick();
  await syncPreviewValues();
});
</script>

<template>
  <Card title="Playground valueFormat / getValues 转换">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="primary" @click="handleSetExampleValue">设置示例值</Button>
      <Button @click="handleInspectValues">刷新 getValues</Button>
      <Tag color="blue">{{ liveTag }}</Tag>
    </div>

    <Form />

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <JsonPreview title="getValues 实时转换结果" :value="liveValues" />
      <JsonPreview title="submit 转换结果" :value="transformedValues" />
    </div>
  </Card>
</template>
