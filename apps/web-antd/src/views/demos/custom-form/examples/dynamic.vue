<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { computed, ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

const submittedValues = ref<Record<string, any>>({});
const appended = ref(false);

const baseSchema: VbenFormSchema[] = [
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '个人客户', value: 'personal' },
        { label: '企业客户', value: 'company' },
      ],
      placeholder: '请选择客户类型',
    },
    defaultValue: 'personal',
    fieldName: 'customerType',
    label: '客户类型',
    rules: 'selectRequired',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '个人客户必填',
    },
    clearWhenHidden: true,
    dependencies: {
      required: (values) => values.customerType === 'personal',
      rules: (values) =>
        values.customerType === 'personal'
          ? z.string().min(1, '请输入身份证号')
          : z.string().optional(),
      show: (values) => values.customerType === 'personal',
      triggerFields: ['customerType'],
    },
    fieldName: 'idNo',
    label: '身份证号',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '企业客户必填',
    },
    clearWhenHidden: true,
    dependencies: {
      required: (values) => values.customerType === 'company',
      rules: (values) =>
        values.customerType === 'company'
          ? z.string().min(1, '请输入企业名称')
          : z.string().optional(),
      show: (values) => values.customerType === 'company',
      triggerFields: ['customerType'],
    },
    fieldName: 'companyName',
    label: '企业名称',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      optionType: 'button',
      options: [
        { label: '邮箱', value: 'email' },
        { label: '手机', value: 'phone' },
      ],
    },
    defaultValue: 'email',
    fieldName: 'contactType',
    label: '联系类型',
  },
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      placeholder: '根据联系类型切换校验规则',
    },
    dependencies: {
      componentProps: (values) => ({
        placeholder:
          values.contactType === 'phone'
            ? '请输入 11 位手机号'
            : '请输入邮箱地址',
      }),
      rules: (values) =>
        values.contactType === 'phone'
          ? z.string().regex(/^1\d{10}$/, '请输入正确的手机号')
          : z.string().email('请输入正确的邮箱地址'),
      triggerFields: ['contactType'],
    },
    fieldName: 'contactValue',
    label: '联系方式',
    required: true,
  },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 95,
  },
  handleSubmit: async (values) => {
    submittedValues.value = values;
    message.success('动态表单提交成功');
  },
  schema: baseSchema,
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const fieldNames = formApi.useStore((state) =>
  (state.schema ?? []).map((item) => item.fieldName),
);

const fieldSummary = computed(() => fieldNames.value.join(' / '));

function appendRemarkField() {
  if (appended.value) {
    message.info('备注字段已存在');
    return;
  }
  formApi.appendSchemaByField(
    {
      component: 'Textarea',
      componentProps: {
        allowClear: true,
        autoSize: { minRows: 2, maxRows: 4 },
        placeholder: '动态追加的字段',
      },
      fieldName: 'remark',
      formItemClass: 'md:cols-span-2',
      label: '备注',
    },
    'contactValue',
  );
  appended.value = true;
}

function removeRemarkField() {
  formApi.removeSchemaByFields(['remark']);
  appended.value = false;
}

function disableContact() {
  formApi.updateSchema([
    {
      componentProps: {
        disabled: true,
        placeholder: '已通过 updateSchema 禁用',
      },
      fieldName: 'contactValue',
    },
  ]);
}

function enableContact() {
  formApi.updateSchema([
    {
      componentProps: {
        allowClear: true,
        disabled: false,
        placeholder: '根据联系类型切换校验规则',
      },
      fieldName: 'contactValue',
    },
  ]);
}
</script>

<template>
  <Card title="动态 Schema / 条件字段 / 动态规则">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="dashed" @click="appendRemarkField">追加备注字段</Button>
      <Button @click="removeRemarkField">移除备注字段</Button>
      <Button @click="disableContact">禁用联系方式</Button>
      <Button @click="enableContact">启用联系方式</Button>
    </div>

    <Form />

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <div class="mb-2 text-sm font-medium">当前 Schema 字段</div>
        <pre
          class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >
          {{ fieldSummary }}
        </pre>
      </div>
      <div>
        <div class="mb-2 text-sm font-medium">提交结果</div>
        <pre
          class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >
          {{ JSON.stringify(submittedValues, null, 2) }}
        </pre>
      </div>
    </div>
  </Card>
</template>
