<script lang="ts" setup>
import { defineComponent, h, markRaw, ref } from 'vue';

import { Card, Input, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';
import TwoFields from './modules/two-fields.vue';

const output = ref<Record<string, any>>({});

const CustomInput = markRaw(
  defineComponent({
    name: 'CustomInputForForm',
    props: {
      value: {
        default: '',
        type: String,
      },
    },
    emits: ['blur', 'update:value'],
    setup(props, { emit }) {
      return () =>
        h(Input, {
          allowClear: true,
          placeholder: '这是 schema.component 传入的自定义组件',
          value: props.value,
          onBlur: () => emit('blur'),
          'onUpdate:value': (value: string) => emit('update:value', value),
        });
    },
  }),
);

const [Form] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelClass: 'w-2/6',
  },
  fieldMappingTime: [['field4', ['phoneType', 'phoneNumber'], null]],
  handleSubmit(values) {
    output.value = values;
    message.success('自定义组件提交成功');
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'field',
      label: '自定义后缀',
      suffix: () => h('span', { class: 'text-red-600' }, '元'),
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'field1',
      label: '自定义组件 slot',
      renderComponentContent: () => ({
        prefix: () => 'prefix',
        suffix: () => 'suffix',
      }),
    },
    {
      component: CustomInput,
      fieldName: 'field2',
      label: '自定义组件',
      modelPropName: 'value',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'field3',
      label: '自定义插槽',
      rules: 'required',
    },
    {
      component: markRaw(TwoFields),
      defaultValue: [undefined, ''],
      disabledOnChangeListener: false,
      fieldName: 'field4',
      label: '组合字段',
      rules: z
        .array(z.string().optional())
        .length(2, '请选择类型并输入手机号码')
        .refine((value) => !!value[0], {
          message: '请选择类型',
        })
        .refine((value) => !!value[1] && value[1] !== '', {
          message: '　　　　　　　输入手机号码',
        })
        .refine((value) => value[1]?.match(/^1[3-9]\d{9}$/), {
          message: '　　　　　　　号码格式不正确',
        }),
    },
  ],
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});
</script>

<template>
  <Card title="Playground 自定义组件 / 插槽 / 组合字段">
    <Form>
      <template #field3="slotProps">
        <Input
          v-bind="slotProps"
          allow-clear
          placeholder="通过字段同名 slot 自定义渲染"
        />
      </template>
    </Form>
    <JsonPreview class="mt-4" title="提交结果" :value="output" />
  </Card>
</template>
