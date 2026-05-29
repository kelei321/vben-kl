import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const customFormExampleComponent = () =>
  import('#/views/demos/custom-form/index.vue');

const customFormExampleRoutes: RouteRecordRaw[] = [
  {
    meta: {
      title: '基础表单',
    },
    name: 'CustomTanStackFormBasicDemo',
    path: '/demos/custom-tanstack-form/basic',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '查询表单',
    },
    name: 'CustomTanStackFormQueryDemo',
    path: '/demos/custom-tanstack-form/query',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '校验规则',
    },
    name: 'CustomTanStackFormRulesDemo',
    path: '/demos/custom-tanstack-form/rules',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '动态表单',
    },
    name: 'CustomTanStackFormDynamicDemo',
    path: '/demos/custom-tanstack-form/dynamic',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '自定义组件',
    },
    name: 'CustomTanStackFormCustomDemo',
    path: '/demos/custom-tanstack-form/custom',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '自定义布局',
    },
    name: 'CustomTanStackFormCustomLayoutDemo',
    path: '/demos/custom-tanstack-form/custom-layout',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: 'FormApi',
    },
    name: 'CustomTanStackFormApiDemo',
    path: '/demos/custom-tanstack-form/api',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '数组子表单',
    },
    name: 'CustomTanStackFormArrayDemo',
    path: '/demos/custom-tanstack-form/array',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '多表单合并',
    },
    name: 'CustomTanStackFormMergeDemo',
    path: '/demos/custom-tanstack-form/merge',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '滚动到错误',
    },
    name: 'CustomTanStackFormScrollToErrorDemo',
    path: '/demos/custom-tanstack-form/scroll-to-error',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '可折叠项',
    },
    name: 'CustomTanStackFormCollapsibleDemo',
    path: '/demos/custom-tanstack-form/collapsible',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '值格式化',
    },
    name: 'CustomTanStackFormValueFormatDemo',
    path: '/demos/custom-tanstack-form/value-format',
    component: customFormExampleComponent,
  },
  {
    meta: {
      title: '复杂联动压测',
    },
    name: 'CustomTanStackFormComplexLinkageDemo',
    path: '/demos/custom-tanstack-form/complex-linkage',
    component: customFormExampleComponent,
  },
];

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      title: $t('demos.title'),
    },
    name: 'Demos',
    path: '/demos',
    children: [
      {
        meta: {
          title: $t('demos.antd'),
        },
        name: 'AntDesignDemos',
        path: '/demos/ant-design',
        component: () => import('#/views/demos/antd/index.vue'),
      },
      {
        meta: {
          icon: 'lucide:clipboard-list',
          title: 'Form 示例',
        },
        name: 'CustomTanStackFormDemo',
        path: '/demos/custom-tanstack-form',
        redirect: '/demos/custom-tanstack-form/basic',
        children: customFormExampleRoutes,
      },
    ],
  },
];

export default routes;
