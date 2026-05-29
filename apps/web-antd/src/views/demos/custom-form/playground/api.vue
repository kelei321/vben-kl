<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const output = ref<Record<string, any>>({});
const isReverseActionButtons = ref(false);
let appendIndex = 1;

const [BaseForm, formApi] = useVbenForm({
  actionButtonsReverse: isReverseActionButtons.value,
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 90,
  },
  handleSubmit: onSubmit,
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入 field1' },
      fieldName: 'field1',
      label: 'field1',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入 field2' },
      fieldName: 'field2',
      label: 'field2',
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
      fieldName: 'fieldOptions',
      label: '下拉选',
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
});

function onSubmit(values: Record<string, any>) {
  output.value = { action: 'submit', values };
  message.success('提交成功');
}

async function handleClick(
  action:
    | 'appendSchemaByField'
    | 'getValues'
    | 'hideDefaultActions'
    | 'removeSchemaByFields'
    | 'resetForm'
    | 'setFieldValue'
    | 'setState'
    | 'setValues'
    | 'showDefaultActions'
    | 'updateSchema'
    | 'validate'
    | 'validateField',
) {
  switch (action) {
    case 'appendSchemaByField': {
      const fieldName = `field${appendIndex + 2}`;
      formApi.appendSchemaByField(
        {
          component: 'Input',
          componentProps: {
            allowClear: true,
            placeholder: `动态追加 ${fieldName}`,
          },
          fieldName,
          label: fieldName,
        },
        'field2',
      );
      appendIndex += 1;
      break;
    }
    case 'getValues': {
      output.value = { action, values: await formApi.getValues() };
      break;
    }
    case 'hideDefaultActions': {
      formApi.setState({ showDefaultActions: false });
      break;
    }
    case 'removeSchemaByFields': {
      formApi.removeSchemaByFields(['field3', 'field4', 'field5']);
      break;
    }
    case 'resetForm': {
      await formApi.resetForm();
      break;
    }
    case 'setFieldValue': {
      await formApi.setFieldValue('field1', `field1-${Date.now()}`);
      output.value = { action, values: await formApi.getValues() };
      break;
    }
    case 'setState': {
      isReverseActionButtons.value = !isReverseActionButtons.value;
      formApi.setState({ actionButtonsReverse: isReverseActionButtons.value });
      break;
    }
    case 'setValues': {
      await formApi.setValues({
        field1: 'value1',
        field2: 'value2',
        fieldOptions: '1',
      });
      output.value = { action, values: await formApi.getValues() };
      break;
    }
    case 'showDefaultActions': {
      formApi.setState({ showDefaultActions: true });
      break;
    }
    case 'updateSchema': {
      formApi.updateSchema([
        {
          componentProps: {
            allowClear: true,
            options: [
              { label: '新选项1', value: 'new-1' },
              { label: '新选项2', value: 'new-2' },
              { label: '新选项3', value: 'new-3' },
            ],
            placeholder: '已更新 options',
          },
          fieldName: 'fieldOptions',
          label: '已更新下拉',
        },
      ]);
      break;
    }
    case 'validate': {
      output.value = { action, result: await formApi.validate() };
      break;
    }
    case 'validateField': {
      output.value = { action, result: await formApi.validateField('field1') };
      break;
    }
  }
}
</script>

<template>
  <Card title="Playground FormApi">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button type="primary" @click="handleClick('setValues')">
        setValues
      </Button>
      <Button @click="handleClick('setFieldValue')">setFieldValue</Button>
      <Button @click="handleClick('getValues')">getValues</Button>
      <Button @click="handleClick('validate')">validate</Button>
      <Button @click="handleClick('validateField')">validateField</Button>
      <Button @click="handleClick('resetForm')">resetForm</Button>
      <Button @click="handleClick('appendSchemaByField')">appendSchema</Button>
      <Button @click="handleClick('removeSchemaByFields')">removeSchema</Button>
      <Button @click="handleClick('updateSchema')">updateSchema</Button>
      <Button @click="handleClick('hideDefaultActions')">隐藏默认按钮</Button>
      <Button @click="handleClick('showDefaultActions')">显示默认按钮</Button>
      <Button @click="handleClick('setState')">翻转按钮</Button>
    </div>
    <BaseForm />
    <JsonPreview class="mt-4" title="API 输出" :value="output" />
  </Card>
</template>
