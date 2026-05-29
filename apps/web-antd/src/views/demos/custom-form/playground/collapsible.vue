<script lang="ts" setup>
import type { CollapsibleParamSchema } from '@vben/common-ui';

import { markRaw, ref } from 'vue';

import { VbenCollapsibleParams } from '@vben/common-ui';

import { Button, Card, message, RadioGroup } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

const layout = ref<'horizontal' | 'vertical'>('vertical');
const output = ref<Record<string, any>>({});

const layouts = [
  { label: 'Vertical', value: 'vertical' },
  { label: 'Horizontal', value: 'horizontal' },
];

function getNumberValidator(key: string, limit?: [number?, number?]) {
  let validator = z.number({
    invalid_type_error: `${key} 值只能为数字`,
    required_error: `${key} 值不能为空`,
  });

  if (limit) {
    if (limit[0] !== undefined) {
      validator = validator.min(limit[0], {
        message: `${key} 值不能小于 ${limit[0]}`,
      });
    }
    if (limit[1] !== undefined) {
      validator = validator.max(limit[1], {
        message: `${key} 值不能大于 ${limit[1]}`,
      });
    }
  }

  return validator.optional();
}

const paramsSchema: CollapsibleParamSchema[] = [
  {
    key: 'micro_batch_size',
    description: '批次大小，代表模型训练过程中更新参数的数据步长。',
    option: { min: 8, max: 1024, step: 8 },
  },
  {
    key: 'learning_rate',
    description: '学习率，数值越大参数变化越大。',
    option: { step: 1e-4, type: 'exponential', min: 0, max: 1 },
  },
  {
    key: 'eval_steps',
    description: '验证步数，用于阶段性评估模型训练效果。',
    option: { min: 1, max: 2_147_483_647 },
  },
  {
    key: 'num_train_epochs',
    description: '循环次数，代表模型学习数据集的轮数。',
    option: { min: 1, max: 200 },
  },
  {
    key: 'max_length',
    description: '序列长度，单个训练数据样本的最大长度。',
    option: { min: 500, max: 131_072 },
  },
  {
    key: 'warmup_ratio',
    description: '学习率预热阶段占总训练步数的比例。',
    option: { min: 0, max: 1, precision: 2, step: 0.01 },
  },
  {
    key: 'save_steps',
    description: 'Checkpoint 保存间隔。',
    option: { min: 1, max: 2_147_483_647 },
  },
];

const paramsValidator = z.object({
  micro_batch_size: getNumberValidator('micro_batch_size', [8, 1024]),
  learning_rate: getNumberValidator('learning_rate'),
  eval_steps: getNumberValidator('eval_steps', [1, 2_147_483_647]),
  num_train_epochs: getNumberValidator('num_train_epochs', [1, 200]),
  max_length: getNumberValidator('max_length', [500, 131_072]),
  warmup_ratio: getNumberValidator('warmup_ratio', [0, 1]),
  save_steps: getNumberValidator('save_steps', [1, 2_147_483_647]),
});

const [BaseForm, baseFormApi] = useVbenForm({
  showDefaultActions: false,
  commonConfig: {
    colon: true,
    componentProps: {
      class: 'w-full',
    },
  },
  handleSubmit(values) {
    output.value = values;
    message.success('参数表单提交成功');
  },
  layout: layout.value,
  schema: [
    {
      component: 'Switch',
      componentProps: {
        checkedChildren: '开',
        class: 'w-auto',
        unCheckedChildren: '关',
      },
      defaultValue: false,
      fieldName: 'qat',
      formItemClass: 'col-span-2',
      label: 'QAT',
    },
    {
      component: markRaw(VbenCollapsibleParams),
      componentProps: {
        params: paramsSchema,
        visibleCount: 3,
      },
      defaultValue: {
        micro_batch_size: 8,
        learning_rate: 1e-5,
        eval_steps: 50,
        num_train_epochs: 3,
        max_length: 32_768,
        warmup_ratio: 0.05,
        save_steps: 50,
      },
      dependencies: {
        componentProps(values) {
          return {
            params: values.qat
              ? [
                  {
                    key: 'calib_steps',
                    description:
                      '校准步数；校准的数据集大小 = 校准步数 * batch_size。',
                    option: { min: 1 },
                  },
                  ...paramsSchema,
                ]
              : paramsSchema,
          };
        },
        rules(values) {
          if (values.qat) {
            return paramsValidator.extend({
              calib_steps: getNumberValidator('calib_steps', [1]),
            });
          }
          return paramsValidator;
        },
        trigger(values, _form, controller) {
          const paramsRef =
            controller.getFieldComponentRef<typeof VbenCollapsibleParams>(
              'params',
            );
          if (values.qat) {
            paramsRef?.updateValues?.({
              calib_steps: 10,
              micro_batch_size: 32,
              learning_rate: 4e-5,
              eval_steps: 80,
              num_train_epochs: 3,
              max_length: 32_768,
              warmup_ratio: 0.1,
              save_steps: 80,
            });
          } else {
            paramsRef?.updateValues?.({ calib_steps: null });
          }
        },
        triggerFields: ['qat'],
      },
      fieldName: 'params',
      formItemClass: 'col-span-12 items-baseline col-start-1',
      label: '参数配置',
      modelPropName: 'value',
      rules: paramsValidator,
    },
    {
      component: 'Textarea',
      componentProps: {
        autoSize: { minRows: 3, maxRows: 6 },
        placeholder: '这里用 Textarea 替代 playground 的 RichEditor',
      },
      collapsible: true,
      defaultCollapsed: false,
      fieldName: 'richEditor',
      formItemClass: 'col-span-12 items-baseline',
      label: '可折叠项',
    },
  ],
  wrapperClass: 'grid-cols-12',
});

function onLayoutChange() {
  baseFormApi.setState({ layout: layout.value });
}

function handleSetFormValue() {
  baseFormApi.setFieldValue('params', {
    micro_batch_size: 1024,
    learning_rate: 1e-5,
    eval_steps: 150,
    num_train_epochs: 13,
    max_length: 131_072,
    warmup_ratio: 0.05,
    save_steps: 150,
  });
}

function handleResetFormValue() {
  baseFormApi.resetForm(undefined, { force: true });
}

async function handleSubmitFormValue() {
  const { valid } = await baseFormApi.validate();
  if (valid) {
    await baseFormApi.submitForm();
  }
}
</script>

<template>
  <Card title="Playground 可折叠表单项 / 参数配置组件">
    <template #extra>
      <div class="inline-flex items-center gap-2">
        <RadioGroup
          v-model:value="layout"
          :options="layouts"
          option-type="button"
          @change="onLayoutChange"
        />
        <Button type="primary" @click="handleSetFormValue">设置值</Button>
        <Button type="primary" @click="handleSubmitFormValue">提交</Button>
        <Button @click="handleResetFormValue">重置</Button>
      </div>
    </template>
    <div class="w-full overflow-hidden">
      <BaseForm />
    </div>
    <JsonPreview class="mt-4" title="提交结果" :value="output" />
  </Card>
</template>
