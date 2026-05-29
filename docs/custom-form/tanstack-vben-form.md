# Custom TanStack Vben Form 详细文档

## 1. 目标

`packages/@custom/form-ui` 是一个不侵入 vben core 的自定义表单包，目标是在保留 Vben Form schema 写法的基础上，将内部表单状态切换为：

- `@tanstack/vue-form`：字段值、字段状态、提交、字段级校验；
- `@tanstack/vue-store`：Vben Form 外层配置状态，例如 schema、collapsed、按钮配置等；
- `zod`：运行时校验、类型推导、提交前兜底校验。

官方 TanStack Form Vue 文档说明，`useForm` 配合 `form.Field` 可以使用 render prop 模式构建表单，并支持 `validators.onSubmit/onChange/onBlur` 等校验时机；Zod 可直接作为 Standard Schema validator 使用。TanStack Store Vue 提供 `createStore` 与 `useSelector`，适合做细粒度订阅的外层状态管理。

## 2. 放置位置

```txt
packages/@custom/form-ui
```

不修改 `packages/@core/ui-kit/form-ui`，方便后续同步 vben 官方代码，减少冲突。

## 3. 当前接入范围

目前在 `apps/web-antd` 中使用独立 adapter 接入：

```ts
// apps/web-antd/src/adapter/custom-form.ts
import { setupVbenForm, useVbenForm as useForm, z } from '@vben-custom/form-ui';
```

原有业务页面继续通过 `apps/web-antd/src/adapter/form.ts` 使用 `@vben/common-ui`，核心登录页、通用组件和 vxe-table 等旧逻辑不受影响。

## 4. 目录结构

```txt
packages/@custom/form-ui/
├─ package.json
├─ tsconfig.json
├─ tsdown.config.ts
├─ src/
│  ├─ index.ts
│  ├─ config.ts
│  ├─ use-vben-form.ts
│  ├─ vben-form.vue
│  ├─ vben-use-form.vue
│  ├─ core/
│  │  ├─ field-name.ts
│  │  ├─ form-api.ts
│  │  └─ types.ts
│  ├─ store/
│  │  ├─ create-form-store.ts
│  │  ├─ selectors.ts
│  │  └─ types.ts
│  ├─ zod/
│  │  ├─ build-default-values.ts
│  │  ├─ build-schema.ts
│  │  ├─ errors.ts
│  │  ├─ path.ts
│  │  ├─ rules.ts
│  │  └─ transform.ts
│  ├─ form-render/
│  │  ├─ context.ts
│  │  ├─ dependencies.ts
│  │  ├─ expandable.ts
│  │  ├─ form.vue
│  │  ├─ form-field.vue
│  │  ├─ form-label.vue
│  │  └─ index.ts
│  ├─ components/
│  │  └─ form-actions.vue
│  └─ styles/
│     └─ index.css
└─ __tests__/
   ├─ dependencies.test.ts
   ├─ value-transform.test.ts
   └─ zod-schema.test.ts
```

## 5. 基础用法

```ts
import { useVbenForm, z } from '#/adapter/custom-form';

const [Form, formApi] = useVbenForm({
  schema: [
    {
      fieldName: 'username',
      label: '用户名',
      component: 'Input',
      rules: z.string().min(1, '请输入用户名'),
    },
  ],
  handleSubmit(values) {
    console.log(values);
  },
});
```

```vue
<template>
  <Form />
</template>
```

## 6. Schema 能力

当前支持：

| 能力                          | 状态     | 说明                             |
| ----------------------------- | -------- | -------------------------------- |
| `fieldName`                   | 已支持   | 支持 `user.name` 这类嵌套路径    |
| `label`                       | 已支持   | 支持字符串和渲染函数             |
| `component`                   | 已支持   | 走 adapter 注册的组件            |
| `componentProps`              | 已支持   | 支持对象或函数                   |
| `defaultValue`                | 已支持   | 生成 TanStack Form defaultValues |
| `rules: zod`                  | 已支持   | 字段级 Zod validator             |
| `rules: 'required'`           | 已支持   | 会转换为 Zod refine              |
| `rules: 'selectRequired'`     | 已支持   | 会转换为 Zod refine              |
| `dependencies.show`           | 已支持   | 动态显隐                         |
| `dependencies.if`             | 已支持   | 动态销毁/渲染                    |
| `dependencies.required`       | 已支持   | 动态必填星号                     |
| `dependencies.rules`          | 已支持   | 动态校验规则                     |
| `dependencies.componentProps` | 已支持   | 动态组件属性                     |
| `dependencies.disabled`       | 已支持   | 动态禁用                         |
| `fieldMappingTime`            | 已支持   | 提交值中拆分时间范围             |
| `arrayToStringFields`         | 已支持   | 数组和字符串互转                 |
| `valueFormat`                 | 已支持   | 提交前字段值格式化               |
| `transform.in/out`            | 已支持   | 入参/出参转换                    |
| `asyncOptions`                | 初步支持 | 自动请求 options，支持 dependsOn |
| `showCollapseButton`          | 已支持   | 复用原折叠计算逻辑               |
| `submitOnEnter`               | 已支持   | 回车提交                         |
| `submitOnChange`              | 已支持   | 值变化后防抖提交                 |

## 7. FormApi 能力

当前实现：

```ts
formApi.getState()
formApi.setState()
formApi.getValues()
formApi.getFieldValue(fieldName)
formApi.setValues(values)
formApi.setFieldValue(fieldName, value)
formApi.resetForm()
formApi.validate()
formApi.validateField(fieldName)
formApi.validateAndSubmitForm()
formApi.submitForm()
formApi.submit()
formApi.clearValidate()
formApi.resetValidate()
formApi.setSchema(schema)
formApi.updateSchema(schema)
formApi.appendSchemaByField(schema, fieldName?)
formApi.removeSchemaByFields(fields)
formApi.getFieldComponentRef(fieldName)
formApi.getFocusedField()
formApi.scrollToFirstError(errors)
formApi.merge(otherApi)
formApi.resetField(fieldName)
formApi.clearField(fieldName)
formApi.focusField(fieldName)
formApi.getFieldError(fieldName)
formApi.setFieldError(fieldName, message)
formApi.getDirtyFields()
formApi.getTouchedFields()
formApi.useStore(selector)
```

## 8. Adapter 说明

Ant Design Vue 当前配置：

```ts
setupVbenForm<ComponentType>({
  config: {
    baseModelPropName: 'value',
    modelPropNameMap: {
      Checkbox: 'checked',
      Radio: 'checked',
      Switch: 'checked',
      Upload: 'modelValue',
    },
  },
  defineRules: {
    required: (value, _params, ctx) => { ... },
    selectRequired: (value, _params, ctx) => { ... },
  },
});
```

字段渲染时会自动绑定：

```txt
[value] + onUpdate:value
[checked] + onUpdate:checked
[modelValue] + onUpdate:modelValue
```

## 9. Demo

新增页面：

```txt
/demos/custom-tanstack-form/basic
```

文件：

```txt
apps/web-antd/src/views/demos/custom-form/index.vue
apps/web-antd/src/views/demos/custom-form/playground/*.vue
```

所有示例都放在系统左侧菜单 `演示 / Form 示例` 下，不再使用页面内 Tabs 或页面内菜单切换。

该页面覆盖：

- Input；
- Select；
- Switch；
- RangePicker；
- Zod 校验；
- `selectRequired`；
- `dependencies.show/required/rules`；
- `fieldMappingTime`；
- `setValues`；
- `validate`；
- `handleSubmit`。

## 10. 测试建议

### 静态测试

```bash
pnpm install
pnpm --filter @vben-custom/form-ui typecheck
pnpm --filter @vben-custom/form-ui test:unit
pnpm --filter @vben/web-antd typecheck
```

### 浏览器回归

```bash
pnpm dev:antd
```

访问：

```txt
http://localhost:5555/demos/custom-tanstack-form/basic
```

检查：

1. 空表单点击提交，应出现用户名和角色错误；
2. 点击“填充示例值”，用户名、角色、授权编码回填；
3. 角色选管理员时，授权编码显示且必填；
4. 角色切换为非管理员时，授权编码隐藏；
5. 选择有效期后提交，输出中出现 `startDate`、`endDate`；
6. 点击“只校验”，根据当前字段状态提示校验通过或失败；
7. 回车触发提交；
8. 展开/折叠按钮可用。

## 11. 后续增强路线

建议下一阶段继续补：

1. `asyncOptions` 缓存、错误态、手动 refresh；
2. 表单分组与多步骤表单；
3. Array 字段增删；
4. detail/readOnly 模式；
5. 字段权限；
6. 表单草稿；
7. 开发环境调试面板；
8. web-ele、web-naive、web-tdesign adapter 切换测试。

## 示例页面补充

`apps/web-antd/src/views/demos/custom-form` 现在包含基础示例与 playground 表单示例。示例通过系统左侧菜单 `演示 / Form 示例` 的子菜单进入，不再在页面内部使用 Tabs 或页面内菜单切换：

| 示例 | 文件 | 覆盖能力 |
| --- | --- | --- |
| 基础表单 | `playground/basic.vue` | 常用组件、远程 options、上传、Zod 校验、日期范围转换 |
| 查询表单 | `playground/query.vue` | 查询表单、行内表单、折叠展开、自定义查询按钮 |
| 校验规则 | `playground/rules.vue` | required、selectRequired、Zod 同步/异步校验 |
| 动态表单 | `playground/dynamic.vue` | dependencies、动态规则、动态 props、动态 Schema |
| 自定义组件 | `playground/custom.vue` | 自定义组件、slot、组合字段、fieldMappingTime |
| 自定义布局 | `playground/custom-layout.vue` | grid 布局、跨列、起始列、隐藏 label、分割线 |
| FormApi | `playground/api.vue` | setValues、getValues、validate、schema 操作 |
| 多表单合并 | `playground/merge.vue` | 多个表单实例合并提交 |
| 滚动到错误 | `playground/scroll-to-error-test.vue` | scrollToFirstError、validateAndSubmitForm、validateField |
| 可折叠项 | `playground/collapsible.vue` | VbenCollapsibleParams、动态参数、动态校验 |
| 值格式化 | `playground/value-format.vue` | valueFormat、getValues 转换、submit 转换 |
| 复杂联动压测 | `playground/complex-linkage.vue` | 大量字段、嵌套 fieldName、动态 rules、远程 options 竞态、trigger 写其他字段、trigger 写回自身防循环 |

访问路径：

```txt
/demos/custom-tanstack-form/basic
/demos/custom-tanstack-form/complex-linkage
```

### 基础表单示例

适合用来验证最基础的表单闭环：

```txt
schema 渲染 -> 输入 -> Zod 校验 -> 动态字段 -> 提交 -> 输出 values
```

重点测试：

1. 不填用户名提交，应显示用户名必填错误。
2. 不选角色提交，应显示角色必选错误。
3. 角色选择管理员后，授权编码字段显示并变为必填。
4. 角色切换为非管理员后，授权编码字段隐藏并清空。
5. 有效期会通过 `fieldMappingTime` 转成 `startDate` 与 `endDate`。

### 搜索表单示例

适合用来验证后台列表查询场景：

```txt
折叠表单 + 回车搜索 + 查询/重置按钮 + 远程选项 + 日期范围转换
```

重点测试：

1. 点击“填充常用搜索”后，搜索条件自动回填。
2. 选择业务线后，负责人字段显示并模拟加载远程选项。
3. 点击查询后，下方输出最终查询参数。
4. 点击重置后，输出清空。

### 动态 Schema 示例

适合用来验证复杂业务表单：

```txt
字段显示隐藏 + 动态规则 + 动态 props + 运行时增删改 schema
```

重点测试：

1. 客户类型为个人时显示身份证号，为企业时显示企业名称。
2. 联系类型切换邮箱/手机后，联系方式的 placeholder 和校验规则同步切换。
3. 点击追加备注字段，表单中插入新字段。
4. 点击移除备注字段，动态字段从 schema 中删除。
5. 点击禁用/启用联系方式，验证 `updateSchema` 生效。

### 高级组件示例

适合用来验证更多组件与复杂值结构：

```txt
嵌套对象字段 + 数组字段 + 组件适配 + 输出转换
```

重点测试：

1. `profile.name`、`profile.age`、`profile.direction` 能输出为嵌套对象。
2. `skills` 能输出为数组。
3. `description` 提交时会通过 `transform.out` 去除前后空格。
4. `TreeSelect`、`CheckboxGroup`、`Rate`、`InputNumber` 的值能正常读写。

### FormApi 示例

适合用来验证外部控制表单：

```txt
formApi 方法 + store selector + 手动错误 + disabled 状态切换
```

重点测试：

1. `setValues` 能写入账号、密码和权限。
2. `getValues` 能读取当前表单值。
3. `validateField('account')` 能单独校验账号字段。
4. `setFieldError` 能手动设置错误，`clearValidate` 能清除。
5. `setState` 能切换全局 disabled。
6. Store 快照能显示当前字段数量、布局和 disabled 状态。

### 复杂联动压测示例

适合用来验证表单封装在复杂业务场景下的边界：

```txt
大量字段 + 嵌套 fieldName + 动态规则 + 远程 options 竞态 + trigger 写回自身
```

重点测试：

1. 调整压测字段数并点击“重建 Schema”，观察字段数量、依赖字段数量和页面响应。
2. 点击“批量 setValues”，验证 80~240 个字段批量写值不会卡死。
3. 点击“嵌套写回探针”，验证 `dependencies.trigger` 写其他字段和写回自身不会形成 watch 循环。
4. 点击“远程竞态探针”，验证快速切换远程 options 依赖时只保留最后一次请求结果。
5. 点击“校验性能”，观察大 schema 下 Zod 校验耗时。

## 响应式安全优化

新版 custom form 在内核层增加了几类防线，避免复杂联动表单出现重复写入或响应式循环：

1. `setFieldValue`、`setValues`、动态删除字段清值都会先比较新旧值，值没有变化时不再写回 TanStack Form。
2. 隐藏字段 `clearWhenHidden` 也复用统一写值逻辑，字段本来就是 `undefined` 时不会重复触发更新。
3. `dependencies.trigger` 默认不在初始挂载时执行，只负责响应 `triggerFields` 后续变化；需要初始化时执行副作用时可显式设置 `triggerOnMount: true`。
4. `dependencies` 的异步计算带有版本号保护，旧的异步结果不会覆盖新的依赖状态。
5. `asyncOptions` 带有请求序号保护，快速切换依赖字段时只接收最后一次请求结果。
6. 自定义组件示例改为每次 emit 新数组/新对象，不再原地修改 `modelValue`。

业务侧约束建议：`componentProps`、`renderComponentContent`、`rules`、`show`、`if` 应保持纯函数，不要在这些函数里写回表单值；有副作用的联动逻辑统一放到 `dependencies.trigger`。

## 数组子表单

`packages/@custom/form-ui` 支持通过 schema 内置项声明对象数组子表单，首版用于联系人、商品明细、审批节点这类对象数组场景：

```ts
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Array',
      fieldName: 'contacts',
      label: '联系人',
      minRows: 1,
      maxRows: 5,
      copyable: true,
      sortable: true,
      addButtonText: '新增联系人',
      children: [
        {
          component: 'Input',
          fieldName: 'name',
          label: '姓名',
          rules: z.string().min(1, '请输入联系人姓名'),
        },
        {
          component: 'Input',
          fieldName: 'phone',
          label: '手机号',
          rules: z.string().min(1, '请输入手机号'),
        },
      ],
    },
  ],
});
```

数组项 `children` 复用普通字段 schema，子字段 `fieldName` 写相对路径，渲染时会自动转换成 `contacts[0].name`。提交值保持对象数组结构：

```ts
{
  contacts: [{ name: '张三', phone: '13800000000' }];
}
```

配套 FormApi：

```ts
formApi.appendArrayItem('contacts', { name: '张三' });
formApi.insertArrayItem('contacts', 0, { name: '李四' });
formApi.removeArrayItem('contacts', 0);
formApi.moveArrayItem('contacts', 0, 1);
formApi.swapArrayItems('contacts', 0, 1);
formApi.clearArrayItems('contacts');
```

当前限制：

- 首版只支持对象数组，不支持数组内再嵌套数组。
- 数组 schema 本身支持 `minRows/maxRows`，子字段校验仍使用现有 `rules`、`dependencies`、`asyncOptions` 能力。
- web-antd 示例入口为 `/demos/custom-tanstack-form/array`。
