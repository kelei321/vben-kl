<script lang="ts" setup>
import { ref } from 'vue';

import { Alert, Button, Card, message, Space, Tag } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});

const rowScopeDescription = [
  '数组 children 的 dependencies 默认使用 row 作用域：',
  "triggerFields: ['type'] 会解析到当前行 contacts[index].type。",
  '依赖回调 values 中额外提供 $row、$index、$array。',
  "使用 $root.xxx 或 scope: 'form' 可访问根表单字段。",
].join('');

const [ArrayLinkageForm, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 110,
  },
  handleSubmit(values) {
    output.value = { action: 'submit', values };
    message.success('复杂数组联动提交成功');
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Select',
      componentProps: {
        allowClear: false,
        options: [
          { label: '普通模式', value: 'normal' },
          { label: '严格模式', value: 'strict' },
        ],
      },
      defaultValue: 'normal',
      fieldName: 'mode',
      label: '根模式',
    },
    {
      addButtonText: '新增联系人',
      children: [
        {
          component: 'Select',
          componentProps: {
            allowClear: false,
            options: [
              { label: '业务联系人', value: 'business' },
              { label: '财务联系人', value: 'finance' },
              { label: '技术联系人', value: 'tech' },
            ],
          },
          defaultValue: 'business',
          fieldName: 'type',
          label: '类型',
          rules: 'selectRequired',
        },
        {
          component: 'Input',
          componentProps: {
            allowClear: true,
            placeholder: '联系人姓名',
          },
          fieldName: 'name',
          label: '姓名',
          rules: 'required',
        },
        {
          component: 'Input',
          componentProps: {
            allowClear: true,
            placeholder: '财务联系人必填税号，其它类型可选',
          },
          dependencies: {
            required: (values) => values.$row?.type === 'finance',
            rules: (values) =>
              values.$row?.type === 'finance'
                ? z.string().min(1, '财务联系人必须填写税号')
                : z.string().optional(),
            triggerFields: ['type'],
          },
          fieldName: 'taxNo',
          label: '税号',
        },
        {
          component: 'Input',
          componentProps: {
            allowClear: true,
            placeholder: '严格模式或技术联系人必填邮箱',
          },
          dependencies: {
            required: (values) =>
              values.$row?.type === 'tech' || values.mode === 'strict',
            rules: (values) =>
              values.$row?.type === 'tech' || values.mode === 'strict'
                ? z.string().email('请输入正确邮箱')
                : z.union([z.string().email('请输入正确邮箱'), z.literal('')]),
            triggerFields: ['type', '$root.mode'],
          },
          fieldName: 'email',
          label: '邮箱',
        },
        {
          component: 'Input',
          componentProps: {
            allowClear: true,
            placeholder: '由类型自动生成，可手动修改',
          },
          dependencies: {
            componentProps: (values) => {
              const rowIndex = Number(values.$index ?? 0) + 1;
              const rowType = values.$row?.type ?? '-';

              return {
                placeholder: `第 ${rowIndex} 行，当前类型：${rowType}`,
              };
            },
            trigger: async (values, _form, controller) => {
              const remarkField = `contacts[${values.$index}].remark`;
              const typeLabelMap: Record<string, string> = {
                business: '业务联系人',
                finance: '财务联系人',
                tech: '技术联系人',
              };
              const nextRemark = typeLabelMap[String(values.$row?.type)] ?? '';
              await controller.setFieldValue(remarkField, nextRemark);
            },
            triggerFields: ['type'],
          },
          fieldName: 'remark',
          label: '备注',
        },
      ],
      childrenWrapperClass: 'grid grid-cols-1 gap-x-4 md:grid-cols-3',
      component: 'Array',
      copyable: true,
      copyExcludeFields: ['backendId'],
      defaultItem: {
        backendId: 'server-id-001',
        email: '',
        name: '',
        remark: '',
        taxNo: '',
        type: 'business',
      },
      defaultValue: [
        {
          backendId: 'server-id-001',
          email: 'business@example.com',
          name: '张三',
          remark: '业务联系人',
          taxNo: '',
          type: 'business',
        },
        {
          backendId: 'server-id-002',
          email: 'finance@example.com',
          name: '李四',
          remark: '财务联系人',
          taxNo: 'TAX-001',
          type: 'finance',
        },
      ],
      description: '测试数组行内联动、根字段联动、复制过滤字段和布局扩展。',
      fieldName: 'contacts',
      label: '联系人列表',
      maxRows: 8,
      minRows: 1,
      rowClass: (_row, index) => (index % 2 === 0 ? 'bg-muted/20' : ''),
      sortable: true,
    },
  ],
  scrollToFirstError: true,
  showDefaultActions: true,
  wrapperClass: 'grid-cols-1',
});

async function copyFirstRow() {
  await formApi.insertArrayItem('contacts', 1, {
    email: '',
    name: '复制行',
    remark: '通过 FormApi 插入',
    taxNo: '',
    type: 'business',
  });
  output.value = await formApi.getValues();
  message.success('已通过 FormApi 插入一行');
}

async function readValues() {
  output.value = await formApi.getValues();
}

async function setStrictMode() {
  await formApi.setFieldValue('mode', 'strict');
  message.info('严格模式下所有邮箱必填');
}
</script>

<template>
  <div class="space-y-4">
    <Alert
      :description="rowScopeDescription"
      message="复杂数组联动示例"
      show-icon
      type="info"
    />

    <Card title="操作区">
      <Space wrap>
        <Button type="primary" @click="setStrictMode">切到严格模式</Button>
        <Button @click="copyFirstRow">FormApi 插入一行</Button>
        <Button @click="readValues">读取 values</Button>
        <Tag color="blue">row scope</Tag>
        <Tag color="purple">$row / $index / $array</Tag>
        <Tag color="green">$root.mode</Tag>
      </Space>
    </Card>

    <Card title="数组联动表单">
      <ArrayLinkageForm />
    </Card>

    <JsonPreview :value="output" title="当前输出" />
  </div>
</template>
