import type {
  VbenFormProps as FormProps,
  VbenFormSchema as FormSchema,
} from '@vben-custom/form-ui';

import type { ComponentPropsMap, ComponentType } from './component';

import { $t } from '@vben/locales';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben-custom/form-ui';

async function initSetupCustomVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      // ant design vue组件库默认都是 v-model:value
      baseModelPropName: 'value',

      // 一些组件是 v-model:checked 或者 v-model:fileList
      modelPropNameMap: {
        Checkbox: 'checked',
        Radio: 'checked',
        Switch: 'checked',
        // web-antd 的 Upload 适配器对外暴露 v-model:modelValue，内部再映射到 antd fileList。
        Upload: 'modelValue',
      },
    },
    defineRules: {
      // 输入项目必填国际化适配
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // 选择项目必填国际化适配
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

const useVbenForm = useForm<ComponentType, ComponentPropsMap>;

export { initSetupCustomVbenForm, useVbenForm, z };

export type VbenFormSchema = FormSchema<ComponentType, ComponentPropsMap>;
export type VbenFormProps = FormProps<ComponentType, ComponentPropsMap>;
