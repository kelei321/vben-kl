<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Card } from 'ant-design-vue';

import PlaygroundApi from './playground/api.vue';
import PlaygroundArray from './playground/array.vue';
import PlaygroundBasic from './playground/basic.vue';
import PlaygroundCollapsible from './playground/collapsible.vue';
import PlaygroundComplexLinkage from './playground/complex-linkage.vue';
import PlaygroundCustomLayout from './playground/custom-layout.vue';
import PlaygroundCustom from './playground/custom.vue';
import PlaygroundDynamic from './playground/dynamic.vue';
import PlaygroundMerge from './playground/merge.vue';
import PlaygroundQuery from './playground/query.vue';
import PlaygroundRules from './playground/rules.vue';
import PlaygroundScrollToError from './playground/scroll-to-error-test.vue';
import PlaygroundValueFormat from './playground/value-format.vue';

const route = useRoute();

const examples = [
  {
    component: PlaygroundBasic,
    description: '基础输入、默认值、提交、重置、主动校验。',
    key: 'basic',
    label: '基础表单',
  },
  {
    component: PlaygroundQuery,
    description: '查询表单、行内表单、折叠展开、自定义查询按钮。',
    key: 'query',
    label: '查询表单',
  },
  {
    component: PlaygroundRules,
    description: 'Zod 校验、必填校验、确认密码、自定义错误。',
    key: 'rules',
    label: '校验规则',
  },
  {
    component: PlaygroundDynamic,
    description: '条件字段、动态规则、动态 componentProps、动态 Schema。',
    key: 'dynamic',
    label: '动态表单',
  },
  {
    component: PlaygroundCustom,
    description: '自定义组件、renderComponentContent、组合字段。',
    key: 'custom',
    label: '自定义组件',
  },
  {
    component: PlaygroundCustomLayout,
    description: '自定义布局、表单项 class、label/wrapper 样式。',
    key: 'custom-layout',
    label: '自定义布局',
  },
  {
    component: PlaygroundApi,
    description: 'setValues、getValues、validate、updateSchema 等 FormApi。',
    key: 'api',
    label: 'FormApi',
  },
  {
    component: PlaygroundArray,
    description: '对象数组子表单、行级增删复制排序、子字段校验。',
    key: 'array',
    label: '数组子表单',
  },
  {
    component: PlaygroundMerge,
    description: '多个表单实例合并提交。',
    key: 'merge',
    label: '多表单合并',
  },
  {
    component: PlaygroundScrollToError,
    description: '校验失败后滚动到第一个错误字段。',
    key: 'scroll-to-error',
    label: '滚动到错误',
  },
  {
    component: PlaygroundCollapsible,
    description: '可折叠表单项、collapsedRows、配置项联动。',
    key: 'collapsible',
    label: '可折叠项',
  },
  {
    component: PlaygroundValueFormat,
    description: 'fieldMappingTime、arrayToStringFields、valueFormat。',
    key: 'value-format',
    label: '值格式化',
  },
  {
    component: PlaygroundComplexLinkage,
    description:
      '大量字段、嵌套 fieldName、动态规则、远程 options 竞态、trigger 写回自身防循环。',
    key: 'complex-linkage',
    label: '复杂联动压测',
  },
];

const fallbackExample = examples[0] as (typeof examples)[number];

const activeExample = computed(() => {
  const routeSegments = route.path.split('/').filter(Boolean);
  const routeKey = String(routeSegments[routeSegments.length - 1] ?? 'basic');

  return examples.find((item) => item.key === routeKey) ?? fallbackExample;
});
</script>

<template>
  <Page :description="activeExample.description" :title="activeExample.label">
    <Card class="mb-4" size="small" title="Custom TanStack Vben Form">
      <p class="text-muted-foreground m-0 text-sm">
        基于 packages/@custom/form-ui：TanStack Vue Form + TanStack Vue Store +
        Zod；所有示例已放到左侧“演示 / Form 示例”子菜单下。
      </p>
    </Card>

    <component :is="activeExample.component" :key="activeExample.key" />
  </Page>
</template>
