<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});
let addIndex = 1;

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  handleSubmit(values) {
    output.value = values;
    message.success('动态表单提交成功');
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      defaultValue: 'hidden value',
      dependencies: {
        show: false,
        triggerFields: ['field1Switch'],
      },
      fieldName: 'hiddenField',
      label: '隐藏字段',
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'field1Switch',
      label: '显示 field1',
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'field2Switch',
      label: '必填 field2',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'field3Switch',
      label: '禁用 field3',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'field4Switch',
      label: '切换 field4 props',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: 'field1Switch 开启时显示',
      },
      clearWhenHidden: true,
      dependencies: {
        show: (values) => !!values.field1Switch,
        triggerFields: ['field1Switch'],
      },
      fieldName: 'field1',
      label: '条件显示',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: 'field2Switch 开启时必填',
      },
      dependencies: {
        required: (values) => !!values.field2Switch,
        rules: (values) =>
          values.field2Switch
            ? z.string().min(1, 'field2 必填')
            : z.string().optional(),
        triggerFields: ['field2Switch'],
      },
      fieldName: 'field2',
      label: '动态必填',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: 'field3Switch 开启时禁用',
      },
      dependencies: {
        disabled: (values) => !!values.field3Switch,
        triggerFields: ['field3Switch'],
      },
      fieldName: 'field3',
      label: '动态禁用',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '切换 field4Switch 查看 props 变化',
      },
      dependencies: {
        componentProps: (values) => ({
          placeholder: values.field4Switch
            ? '已切换为手机号校验'
            : '已切换为邮箱校验',
        }),
        rules: (values) =>
          values.field4Switch
            ? z.string().regex(/^1\d{10}$/, '请输入 11 位手机号')
            : z.string().email('请输入正确邮箱'),
        triggerFields: ['field4Switch'],
      },
      fieldName: 'field4',
      label: '动态规则/Props',
      required: true,
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '上海', value: 'shanghai' },
          { label: '杭州', value: 'hangzhou' },
        ],
      },
      fieldName: 'city',
      label: '城市',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        placeholder: '根据城市切换 options',
      },
      dependencies: {
        componentProps: (values) => ({
          options:
            values.city === 'hangzhou'
              ? [
                  { label: '西湖区', value: 'xihu' },
                  { label: '滨江区', value: 'binjiang' },
                ]
              : [
                  { label: '浦东新区', value: 'pudong' },
                  { label: '徐汇区', value: 'xuhui' },
                ],
        }),
        trigger: async (_values, _form, controller) => {
          await controller.setFieldValue('area', undefined);
        },
        triggerFields: ['city'],
      },
      fieldName: 'area',
      label: '地区联动',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '用于测试 removeSchemaByFields',
      },
      fieldName: 'field7',
      label: '可删除字段',
    },
  ],
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [SyncForm] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  handleSubmit(values) {
    message.info(`同步依赖表单：${JSON.stringify(values)}`);
  },
  schema: [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '输入后同步到 field2 placeholder',
      },
      fieldName: 'field1',
      label: '触发字段',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      dependencies: {
        componentProps: (values) => ({
          placeholder: values.field1
            ? `上方输入：${values.field1}`
            : '等待 field1 输入',
        }),
        triggerFields: ['field1'],
      },
      fieldName: 'field2',
      label: '同步字段',
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

function handleDelete() {
  formApi.removeSchemaByFields(['field7']);
}

function handleAdd() {
  const fieldName = `extraField${addIndex++}`;
  formApi.appendSchemaByField(
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '动态追加字段' },
      fieldName,
      label: `动态字段${addIndex - 1}`,
    },
    'field4',
  );
}

function handleUpdate() {
  formApi.updateSchema([
    {
      componentProps: {
        allowClear: true,
        placeholder: '已通过 updateSchema 更新 placeholder',
      },
      fieldName: 'field3',
      label: '已更新字段',
    },
  ]);
}

async function inspectValues() {
  output.value = await formApi.getValues();
}
</script>

<template>
  <div class="space-y-4">
    <Card title="Playground 动态表单 / dependencies / 动态 schema">
      <div class="mb-4 flex flex-wrap gap-2">
        <Button type="primary" @click="handleAdd">添加字段</Button>
        <Button @click="handleDelete">删除 field7</Button>
        <Button @click="handleUpdate">更新 field3</Button>
        <Button @click="inspectValues">读取 values</Button>
      </div>
      <Form />
      <JsonPreview class="mt-4" title="输出" :value="output" />
    </Card>

    <Card title="同步依赖示例">
      <SyncForm />
    </Card>
  </div>
</template>
