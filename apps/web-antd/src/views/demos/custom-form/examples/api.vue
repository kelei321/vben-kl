<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { computed, ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

const output = ref<Record<string, any>>({});

const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      allowClear: true,
      autofocus: true,
    },
    fieldName: 'account',
    label: '账号',
    rules: z.string().min(3, '账号至少 3 位'),
  },
  {
    component: 'InputPassword',
    componentProps: {
      allowClear: true,
    },
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(6, '密码至少 6 位'),
  },
  {
    component: 'Select',
    componentProps: {
      mode: 'multiple',
      options: [
        { label: '系统管理', value: 'system' },
        { label: '数据看板', value: 'dashboard' },
        { label: '报表中心', value: 'report' },
      ],
    },
    fieldName: 'permissions',
    label: '权限',
    rules: z.array(z.string()).min(1, '至少选择一个权限'),
  },
  {
    component: 'Switch',
    defaultValue: false,
    fieldName: 'locked',
    label: '锁定账号',
  },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 90,
  },
  handleSubmit: async (values) => {
    output.value = { action: 'submit', values };
    message.success('提交成功');
  },
  schema,
  scrollToFirstError: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const storeSnapshot = formApi.useStore((state) => ({
  collapsed: state.collapsed,
  disabled: state.commonConfig?.disabled,
  fieldCount: state.schema?.length ?? 0,
  layout: state.layout,
}));

const storeSnapshotText = computed(() =>
  JSON.stringify(storeSnapshot.value, null, 2),
);

async function readValues() {
  output.value = {
    action: 'getValues',
    values: await formApi.getValues(),
  };
}

async function setDemoValues() {
  await formApi.setValues({
    account: 'admin',
    locked: false,
    password: '123456',
    permissions: ['system', 'dashboard'],
  });
  output.value = { action: 'setValues', message: '已写入示例值' };
}

async function validateAccount() {
  const result = await formApi.validateField('account');
  output.value = { action: 'validateField(account)', result };
  message[result.valid ? 'success' : 'error'](
    result.valid ? '账号校验通过' : '账号校验失败',
  );
}

async function setManualError() {
  await formApi.setFieldError(
    'account',
    '这是通过 formApi.setFieldError 设置的错误',
  );
}

async function clearManualError() {
  await formApi.clearValidate('account');
}

function toggleDisabled() {
  const disabled = !formApi.getState().commonConfig?.disabled;
  formApi.setState((prev) => ({
    commonConfig: {
      ...prev.commonConfig,
      disabled,
    },
  }));
}

async function readMeta() {
  output.value = {
    action: 'meta',
    dirtyFields: formApi.getDirtyFields(),
    focusedField: formApi.getFocusedField(),
    touchedFields: formApi.getTouchedFields(),
  };
}
</script>

<template>
  <Card title="FormApi 示例 / Store 订阅 / 手动错误">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="dashed" @click="setDemoValues">setValues</Button>
      <Button @click="readValues">getValues</Button>
      <Button @click="validateAccount">validateField</Button>
      <Button @click="setManualError">setFieldError</Button>
      <Button @click="clearManualError">clearValidate</Button>
      <Button @click="toggleDisabled">切换 disabled</Button>
      <Button @click="readMeta">读取 meta</Button>
    </div>

    <Form />

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <div class="mb-2 text-sm font-medium">formApi 输出</div>
        <pre
          class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >
          {{ JSON.stringify(output, null, 2) }}
        </pre>
      </div>
      <div>
        <div class="mb-2 text-sm font-medium">TanStack Store 快照</div>
        <pre
          class="bg-muted text-muted-foreground overflow-auto rounded-md p-4 text-xs"
        >
          {{ storeSnapshotText }}
        </pre>
      </div>
    </div>
  </Card>
</template>
