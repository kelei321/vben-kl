# TanStack Vben Custom Form 实施报告

## 实施范围

本次实现把自定义表单封装放在 `packages/@custom/form-ui`，不修改 `packages/@core/ui-kit/form-ui` 的 vee-validate 旧实现，降低后续同步 vben 官方代码时的冲突风险。

## 主要改动

- 新增 `@vben-custom/form-ui` 包。
- 新增 TanStack Vue Form + TanStack Vue Store + Zod 的表单内核。
- 新增 Vben 风格 `useVbenForm` API。
- 新增 `FormApi` 包装层，兼容常用 vben form 方法。
- 新增 schema -> defaultValues 与 schema -> Zod object 构建器。
- 新增动态依赖 `dependencies`、动态必填、动态规则、动态组件 props、显示隐藏、隐藏清值。
- 新增 `asyncOptions` 远程 options 基础能力。
- 新增 Ant Design Vue adapter 切换。
- 新增 web-antd Form 示例路由菜单：`/demos/custom-tanstack-form/*`。
- 新增详细使用文档：`docs/custom-form/tanstack-vben-form.md`。

## 新增文件重点

```txt
packages/@custom/form-ui
├─ src/config.ts
├─ src/use-vben-form.ts
├─ src/vben-use-form.vue
├─ src/vben-form.vue
├─ src/core/form-api.ts
├─ src/core/types.ts
├─ src/store/create-form-store.ts
├─ src/form-render/form.vue
├─ src/form-render/form-field.vue
├─ src/form-render/dependencies.ts
├─ src/components/form-actions.vue
└─ src/zod/*
```

## 已覆盖能力

| 能力                                            | 状态           |
| ----------------------------------------------- | -------------- |
| `useVbenForm`                                   | 已实现         |
| `setupVbenForm` adapter                         | 已实现         |
| schema 渲染                                     | 已实现         |
| Ant Design Vue `v-model:value/checked/fileList` | 已接入         |
| 默认值 `defaultValue`                           | 已实现         |
| Zod rules                                       | 已实现         |
| `required/selectRequired` 兼容                  | 已实现         |
| submit/reset 默认按钮                           | 已实现         |
| `getValues/setValues/setFieldValue`             | 已实现         |
| `validate/validateField`                        | 已实现         |
| `updateSchema/setSchema/append/remove`          | 已实现         |
| `dependencies` 动态联动                         | 已实现基础能力 |
| `fieldMappingTime`                              | 已实现         |
| `arrayToStringFields`                           | 已实现         |
| `valueFormat/transform.out`                     | 已实现         |
| 折叠展开                                        | 已实现         |
| `submitOnEnter/submitOnChange`                  | 已实现         |
| `asyncOptions`                                  | 已实现基础能力 |

## 当前限制

- 本环境没有 `node_modules`，且 `corepack` 无法从 npm registry 下载 pnpm，所以未能在容器内完成 `pnpm install`、`pnpm check:type`、`pnpm test:unit`、真实浏览器启动验证。
- `pnpm-lock.yaml` 未自动刷新。拉取补丁后请执行 `pnpm install --no-frozen-lockfile` 或用你的常规 pnpm 安装流程更新 lockfile。
- 当前先完成 `web-antd` adapter 与示例，`web-ele/web-naive/web-tdesign` 可按同样方式逐步切换。
- `asyncOptions` 目前是字段级基础请求能力，尚未做全局缓存、手动 refresh 与竞态取消。

## 本地建议验证命令

```bash
pnpm install --no-frozen-lockfile
pnpm --filter @vben-custom/form-ui typecheck
pnpm --filter @vben-custom/form-ui test:unit
pnpm --filter @vben/web-antd dev
```

浏览器访问：

```txt
/demos/custom-tanstack-form/basic
```

重点验证：

1. 用户名为空提交，应显示 Zod 错误。
2. 角色为空提交，应显示 `selectRequired` 错误。
3. 选择管理员后，应显示授权编码字段并变成必填。
4. 点击“填充示例值”，应能回填 username/role/enabled/authCode。
5. 选择日期范围提交，输出里应包含 `startDate/endDate`，并移除 `dateRange`。
6. 点击重置，应恢复默认值。
7. 回车提交与折叠展开应可用。

## 示例增强记录

本次新增基础示例，并补齐 playground 表单示例。示例现在通过系统左侧菜单 `演示 / Form 示例` 切换，集中放在：

```txt
apps/web-antd/src/views/demos/custom-form
```

新增示例文件：

```txt
apps/web-antd/src/views/demos/custom-form/playground/basic.vue
apps/web-antd/src/views/demos/custom-form/playground/query.vue
apps/web-antd/src/views/demos/custom-form/playground/rules.vue
apps/web-antd/src/views/demos/custom-form/playground/dynamic.vue
apps/web-antd/src/views/demos/custom-form/playground/custom.vue
apps/web-antd/src/views/demos/custom-form/playground/custom-layout.vue
apps/web-antd/src/views/demos/custom-form/playground/api.vue
apps/web-antd/src/views/demos/custom-form/playground/merge.vue
apps/web-antd/src/views/demos/custom-form/playground/scroll-to-error-test.vue
apps/web-antd/src/views/demos/custom-form/playground/collapsible.vue
apps/web-antd/src/views/demos/custom-form/playground/value-format.vue
```

示例覆盖能力：

```txt
基础提交
Zod 校验
动态 dependencies
动态 Schema 增删改
asyncOptions 模拟远程选项
fieldMappingTime
transform.out
嵌套字段
数组字段
FormApi 常用方法
TanStack Store 订阅
```

这次仍然没有修改：

```txt
packages/@core/ui-kit/form-ui
```
