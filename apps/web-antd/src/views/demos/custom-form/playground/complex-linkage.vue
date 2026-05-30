<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/custom-form';

import { computed, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  InputNumber,
  message,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/custom-form';

import JsonPreview from './modules/json-preview.vue';

type MetricName =
  | 'asyncRace'
  | 'batchSet'
  | 'cityReset'
  | 'mirrorWrite'
  | 'selfNormalize'
  | 'validate';

interface MetricsState {
  asyncRaceCount: number;
  batchSetMs: number;
  cityResetCount: number;
  lastChangedFields: string[];
  lastRunMs: number;
  mirrorWriteCount: number;
  selfNormalizeCount: number;
  validateMs: number;
  valuesChangeCount: number;
}

const cityOptionsMap: Record<string, { label: string; value: string }[]> = {
  east: [
    { label: '上海', value: 'shanghai' },
    { label: '杭州', value: 'hangzhou' },
    { label: '南京', value: 'nanjing' },
  ],
  north: [
    { label: '北京', value: 'beijing' },
    { label: '天津', value: 'tianjin' },
    { label: '青岛', value: 'qingdao' },
  ],
  south: [
    { label: '广州', value: 'guangzhou' },
    { label: '深圳', value: 'shenzhen' },
    { label: '厦门', value: 'xiamen' },
  ],
};

const asyncOptionsMap: Record<string, { label: string; value: string }[]> = {
  fast: [
    { label: 'Fast A', value: 'fast-a' },
    { label: 'Fast B', value: 'fast-b' },
  ],
  slow: [
    { label: 'Slow A', value: 'slow-a' },
    { label: 'Slow B', value: 'slow-b' },
  ],
};

const stressAlertDescription =
  '覆盖大量字段、嵌套 fieldName、动态 rules、动态 componentProps、远程 options 竞态、trigger 写其他字段、trigger 写回自身等场景。重点观察页面是否卡死、字段是否重复抖动、valuesChange 是否异常暴涨。';
const stressAlertMessage = '该示例用于压测自定义 TanStack Form 封装的边界行为';

const fieldCount = ref(80);
const output = ref<Record<string, any>>({});
const metrics = ref<MetricsState>({
  asyncRaceCount: 0,
  batchSetMs: 0,
  cityResetCount: 0,
  lastChangedFields: [],
  lastRunMs: 0,
  mirrorWriteCount: 0,
  selfNormalizeCount: 0,
  validateMs: 0,
  valuesChangeCount: 0,
});

function getCityOptions(region: unknown) {
  return cityOptionsMap[String(region || 'east')] ?? cityOptionsMap.east ?? [];
}

function getFormValue(
  values: Record<string, any> | undefined,
  fieldName: string,
) {
  if (!values) {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
    return values[fieldName];
  }

  let current: any = values;
  for (const key of fieldName.split('.')) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function markMetric(name: MetricName, duration = 0) {
  const current = metrics.value;

  if (name === 'asyncRace') {
    current.asyncRaceCount += 1;
  }
  if (name === 'batchSet') {
    current.batchSetMs = duration;
  }
  if (name === 'cityReset') {
    current.cityResetCount += 1;
  }
  if (name === 'mirrorWrite') {
    current.mirrorWriteCount += 1;
  }
  if (name === 'selfNormalize') {
    current.selfNormalizeCount += 1;
  }
  if (name === 'validate') {
    current.validateMs = duration;
  }

  metrics.value = { ...current, lastRunMs: duration || current.lastRunMs };
}

function createStressSchema(count: number): VbenFormSchema[] {
  const stressCount = Math.max(20, Math.min(count, 240));
  const schema: VbenFormSchema[] = [
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: '普通模式', value: 'normal' },
          { label: '专家模式', value: 'expert' },
        ],
      },
      defaultValue: 'normal',
      fieldName: 'profile.mode',
      label: '表单模式',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: false,
        options: [
          { label: '华东', value: 'east' },
          { label: '华北', value: 'north' },
          { label: '华南', value: 'south' },
        ],
      },
      defaultValue: 'east',
      fieldName: 'profile.region',
      label: '区域',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: getCityOptions('east'),
        placeholder: '区域变化时动态切换城市 options，并重置非法城市',
      },
      dependencies: {
        componentProps: (values) => {
          const region = getFormValue(values, 'profile.region') || 'east';
          return {
            options: getCityOptions(region),
            placeholder: `当前区域：${region}`,
          };
        },
        trigger: async (values, _form, controller) => {
          const cities = getCityOptions(getFormValue(values, 'profile.region'));
          const currentCity = String(
            getFormValue(values, 'profile.city') || '',
          );
          const hasCity = cities?.some((item) => item.value === currentCity);
          if (currentCity && !hasCity) {
            markMetric('cityReset');
            await controller.setFieldValue('profile.city', undefined);
          }
        },
        triggerFields: ['profile.region'],
      },
      fieldName: 'profile.city',
      label: '城市联动',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'guard.enableAdvanced',
      label: '高级字段',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: '快请求', value: 'fast' },
          { label: '慢请求', value: 'slow' },
        ],
      },
      defaultValue: 'fast',
      fieldName: 'async.parent',
      label: '远程父级',
    },
    {
      component: 'Select',
      asyncOptions: {
        clearValueOnDepsChange: true,
        dependsOn: ['async.parent'],
        keepPreviousData: true,
        queryKey: (values) => [
          'complex-linkage-async-child',
          getFormValue(values, 'async.parent') || 'fast',
        ],
        request: async (values) => {
          const parent = String(getFormValue(values, 'async.parent') || 'fast');
          await sleep(parent === 'slow' ? 550 : 80);
          return asyncOptionsMap[parent] ?? asyncOptionsMap.fast ?? [];
        },
        staleTime: 30_000,
      },
      componentProps: {
        allowClear: true,
        placeholder: '快速切换上级时只保留最后一次远程 options',
      },
      dependencies: {
        trigger: async (_values, _form, controller) => {
          markMetric('asyncRace');
          await controller.setFieldValue('async.child', undefined);
        },
        triggerFields: ['async.parent'],
      },
      fieldName: 'async.child',
      label: '远程子级',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '输入后 trigger 写入右侧镜像字段，测试写其他字段是否循环',
      },
      fieldName: 'guard.source',
      label: '镜像源',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '由 guard.source 自动写入',
      },
      dependencies: {
        disabled: true,
        trigger: async (values, _form, controller) => {
          const source = getFormValue(values, 'guard.source');
          const nextValue = source ? `mirror:${source}` : undefined;
          markMetric('mirrorWrite');
          await controller.setFieldValue('guard.mirror', nextValue);
        },
        triggerFields: ['guard.source'],
      },
      fieldName: 'guard.mirror',
      label: '镜像目标',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder:
          '输入带空格/大写，trigger 写回自身，验证不会 watch 嵌套循环',
      },
      dependencies: {
        trigger: async (values, _form, controller) => {
          const rawValue = String(
            getFormValue(values, 'guard.normalize') || '',
          );
          const normalizedValue = rawValue.trim().toLowerCase();
          if (rawValue !== normalizedValue) {
            markMetric('selfNormalize');
            await controller.setFieldValue('guard.normalize', normalizedValue);
          }
        },
        triggerFields: ['guard.normalize'],
      },
      fieldName: 'guard.normalize',
      label: '自写归一化',
    },
  ];

  for (let index = 0; index < stressCount; index += 1) {
    const fieldName = `stress.field${index}`;
    let triggerFields = ['guard.source'];
    if (index % 3 === 0) {
      triggerFields = ['profile.mode'];
    } else if (index % 3 === 1) {
      triggerFields = ['profile.region'];
    }

    const isNumberField = index % 9 === 0;

    schema.push({
      component: isNumberField ? 'InputNumber' : 'Input',
      componentProps: {
        ...(isNumberField ? {} : { allowClear: true }),
        placeholder: `压测字段 ${index}，依赖 ${triggerFields.join(', ')}`,
      },
      dependencies: {
        componentProps: (values) => ({
          placeholder:
            getFormValue(values, 'profile.mode') === 'expert'
              ? `专家模式字段 ${index}`
              : `普通模式字段 ${index}`,
        }),
        disabled: (values) =>
          getFormValue(values, 'profile.mode') !== 'expert' && index % 13 === 0,
        required: (values) =>
          getFormValue(values, 'profile.mode') === 'expert' && index % 10 === 0,
        rules: (values) =>
          getFormValue(values, 'profile.mode') === 'expert' && index % 10 === 0
            ? z
                .any()
                .refine(
                  (value) =>
                    value !== undefined && value !== null && value !== '',
                  `压测字段 ${index} 必填`,
                )
            : z.any().optional(),
        show: (values) =>
          getFormValue(values, 'profile.mode') === 'expert' ||
          !!getFormValue(values, 'guard.enableAdvanced') ||
          index % 5 !== 0,
        triggerFields,
      },
      fieldName,
      label: `压测字段 ${index}`,
    } as VbenFormSchema);
  }

  return schema;
}

function getSchemaStats(schema: readonly VbenFormSchema[]) {
  return {
    dependencies: schema.filter((item) => item.dependencies).length,
    nested: schema.filter((item) => item.fieldName.includes('.')).length,
    total: schema.length,
  };
}

const initialSchema = createStressSchema(fieldCount.value);
const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  handleSubmit(values) {
    output.value = values;
    message.success('复杂联动表单提交成功');
  },
  handleValuesChange(values, fieldsChanged) {
    metrics.value = {
      ...metrics.value,
      lastChangedFields: fieldsChanged.slice(0, 12),
      valuesChangeCount: metrics.value.valuesChangeCount + 1,
    };
    output.value = values;
  },
  layout: 'horizontal',
  schema: initialSchema,
  scrollToFirstError: true,
  showDefaultActions: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
});

const schemaState = formApi.useStore((state) => state.schema ?? []);
const schemaStats = computed(() => getSchemaStats(schemaState.value));

async function refreshOutput() {
  output.value = await formApi.getValues();
}

function applyStressFieldCount() {
  const nextSchema = createStressSchema(Number(fieldCount.value || 80));
  formApi.setSchema(nextSchema);
  message.success(`已重建 ${nextSchema.length} 个字段`);
}

async function runBatchSetValues() {
  const start = performance.now();
  const patch: Record<string, any> = {
    'async.parent': 'slow',
    'guard.enableAdvanced': true,
    'guard.normalize': '  NEED NORMALIZE  ',
    'guard.source': `source-${Date.now()}`,
    'profile.mode': 'expert',
    'profile.region': 'south',
  };

  for (let index = 0; index < Number(fieldCount.value || 80); index += 1) {
    patch[`stress.field${index}`] = index % 9 === 0 ? index : `value-${index}`;
  }

  await formApi.setValues(patch, true, false);
  await waitFrame();
  const duration = Math.round(performance.now() - start);
  markMetric('batchSet', duration);
  await refreshOutput();
  message.success(`批量写入完成：${duration}ms`);
}

async function runNestedLoopProbe() {
  const start = performance.now();
  for (let index = 0; index < 8; index += 1) {
    await formApi.setFieldValue('guard.source', `loop-${index}`);
  }
  await formApi.setFieldValue('guard.normalize', '  NESTED LOOP PROBE  ');
  await waitFrame();
  const duration = Math.round(performance.now() - start);
  markMetric('batchSet', duration);
  await refreshOutput();
  message.success(`嵌套写回探针完成：${duration}ms`);
}

async function runAsyncRaceProbe() {
  const start = performance.now();
  await formApi.setFieldValue('async.parent', 'slow');
  await formApi.setFieldValue('async.parent', 'fast');
  await sleep(650);
  await waitFrame();
  const duration = Math.round(performance.now() - start);
  markMetric('batchSet', duration);
  await refreshOutput();
  message.success(`远程 options 竞态探针完成：${duration}ms`);
}

async function refreshRemoteOptions() {
  await formApi.refreshOptions('async.child');
  message.success('已刷新远程子级 options');
}

async function validateLargeForm() {
  const start = performance.now();
  const result = await formApi.validate();
  const duration = Math.round(performance.now() - start);
  markMetric('validate', duration);
  if (result.valid) {
    message.success(`校验通过：${duration}ms`);
    return;
  }
  message.warning(`校验未通过：${duration}ms`);
}
</script>

<template>
  <div class="space-y-4">
    <Card title="复杂表单联动 / 性能边界 / watch 嵌套循环探针">
      <div class="space-y-4">
        <Alert
          :description="stressAlertDescription"
          :message="stressAlertMessage"
          show-icon
          type="warning"
        />

        <Space wrap>
          <span class="text-muted-foreground text-sm">压测字段数</span>
          <InputNumber
            v-model:value="fieldCount"
            :max="240"
            :min="20"
            :step="20"
          />
          <Button type="primary" @click="applyStressFieldCount">
            重建 Schema
          </Button>
          <Button @click="runBatchSetValues">批量 setValues</Button>
          <Button @click="runNestedLoopProbe">嵌套写回探针</Button>
          <Button @click="runAsyncRaceProbe">远程竞态探针</Button>
          <Button @click="refreshRemoteOptions">刷新远程 options</Button>
          <Button @click="validateLargeForm">校验性能</Button>
          <Button @click="refreshOutput">读取 values</Button>
        </Space>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card size="small" title="Schema 规模">
        <div class="space-y-2 text-sm">
          <div>
            字段总数：<Tag color="blue">{{ schemaStats.total }}</Tag>
          </div>
          <div>
            依赖字段：<Tag color="purple">{{ schemaStats.dependencies }}</Tag>
          </div>
          <div>
            嵌套字段：<Tag color="cyan">{{ schemaStats.nested }}</Tag>
          </div>
        </div>
      </Card>
      <Card size="small" title="写值 / 校验耗时">
        <div class="space-y-2 text-sm">
          <div>
            批量写入：<Tag>{{ metrics.batchSetMs }}ms</Tag>
          </div>
          <div>
            校验耗时：<Tag>{{ metrics.validateMs }}ms</Tag>
          </div>
          <div>
            最近耗时：<Tag>{{ metrics.lastRunMs }}ms</Tag>
          </div>
        </div>
      </Card>
      <Card size="small" title="联动触发计数">
        <div class="space-y-2 text-sm">
          <div>
            镜像写入：<Tag color="green">{{ metrics.mirrorWriteCount }}</Tag>
          </div>
          <div>
            自写归一：<Tag color="orange">{{ metrics.selfNormalizeCount }}</Tag>
          </div>
          <div>
            城市重置：<Tag color="red">{{ metrics.cityResetCount }}</Tag>
          </div>
          <div>
            远程重置：<Tag color="magenta">{{ metrics.asyncRaceCount }}</Tag>
          </div>
        </div>
      </Card>
      <Card size="small" title="values 变化">
        <div class="space-y-2 text-sm">
          <div>
            变化次数：<Tag color="blue">{{ metrics.valuesChangeCount }}</Tag>
          </div>
          <div class="break-all">
            最近字段：{{ metrics.lastChangedFields.join(', ') || '-' }}
          </div>
        </div>
      </Card>
    </div>

    <Card title="压测表单">
      <Form />
    </Card>

    <JsonPreview
      :value="output"
      title="当前 getValues / handleValuesChange 输出"
    />
  </div>
</template>
