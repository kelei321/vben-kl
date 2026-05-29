# web-antd Playground 表单示例迁移说明

本次在 `apps/web-antd` 的 Custom TanStack Form 演示页中补齐了 `playground/src/views/examples/form` 下的表单示例能力。

访问路径改为左侧路由菜单：

```txt
/demos/custom-tanstack-form/basic
/demos/custom-tanstack-form/query
/demos/custom-tanstack-form/rules
/demos/custom-tanstack-form/dynamic
/demos/custom-tanstack-form/custom
/demos/custom-tanstack-form/custom-layout
/demos/custom-tanstack-form/api
/demos/custom-tanstack-form/array
/demos/custom-tanstack-form/merge
/demos/custom-tanstack-form/scroll-to-error
/demos/custom-tanstack-form/collapsible
/demos/custom-tanstack-form/value-format
/demos/custom-tanstack-form/complex-linkage
```

所有示例都放在系统左侧菜单的 `演示 / Form 示例` 子菜单下，不再在页面内部使用 Tabs 或二级菜单切换。

| 菜单项 | 对应 playground 示例 | 覆盖能力 |
| --- | --- | --- |
| 基础表单 | `basic.vue` | 常用组件、远程 options、日期范围转换、上传、描述/帮助、Zod 校验 |
| 查询表单 | `query.vue` | 默认查询表单、行内表单、折叠展开、自定义操作按钮 |
| 校验规则 | `rules.vue` | required、selectRequired、Zod 同步/异步校验、字段级校验触发 |
| 动态表单 | `dynamic.vue` | dependencies、动态显示、动态禁用、动态 props、动态 rules、append/update/remove schema |
| 自定义组件 | `custom.vue` | suffix、renderComponentContent、字段 slot、自定义组件、组合字段 |
| 自定义布局 | `custom-layout.vue` | grid 自定义布局、跨列、起始列、隐藏 label、分割线 |
| FormApi | `api.vue` | setValues、setFieldValue、getValues、validate、validateField、setState、schema 操作 |
| 数组子表单 | `array.vue` | 对象数组子表单、行级增删复制排序、子字段校验、数组 FormApi |
| 多表单合并 | `merge.vue` | `formApi.merge().submitAllForm()` 多表单合并提交 |
| 滚动到错误 | `scroll-to-error-test.vue` | scrollToFirstError、validateAndSubmitForm、validateField |
| 可折叠项 | `collapsible.vue` | `VbenCollapsibleParams`、collapsible 字段、动态参数、动态校验 |
| 值格式化 | `value-format.vue` | valueFormat、getValues 转换、submit 转换 |
| 复杂联动压测 | `complex-linkage.vue` | 大量字段、嵌套 fieldName、动态 rules、远程 options 竞态、trigger 写其他字段、trigger 写回自身防循环 |

## 适配差异

1. `playground` 中的 `RichEditor` 在当前 `web-antd` 适配器中未注册，本次示例使用 `Textarea` 作为替代。
2. `Upload` 在 `web-antd` 组件适配器中对外暴露 `v-model:modelValue`，本次将 custom form 的 Upload 绑定字段从 `fileList` 调整为 `modelValue`，内部仍由 Upload 适配器映射到 Ant Design Vue 的 `fileList`。
3. 原有业务页面继续使用 `#/adapter/form`；本目录下的 custom form 示例均使用 `#/adapter/custom-form`，实际走的是 `@vben-custom/form-ui`，没有修改 `packages/@core/ui-kit/form-ui`。

## 本地验证建议

```bash
pnpm --filter @vben/web-antd dev
```

打开 `演示 / Form 示例` 后逐个点击左侧子菜单，重点测试：

- 基础表单提交、校验、远程 options、日期范围转换；
- 查询表单折叠展开和自定义操作按钮；
- 动态表单开关联动、动态规则、追加/删除/更新字段；
- 自定义组件的 slot、组合字段与 `fieldMappingTime`；
- FormApi 操作和多表单合并提交；
- 数组子表单新增、复制、删除、排序、子字段必填和提交结构；
- 滚动到错误字段；
- 可折叠参数组件在 QAT 开关下的参数变化；
- valueFormat 拆分字段和时间戳转换；
- 复杂联动压测中的批量 setValues、嵌套写回探针、远程 options 竞态探针和大 schema 校验耗时。
