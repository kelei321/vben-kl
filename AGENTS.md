# Project Instructions

- 默认使用中文回答。
- 修改代码前，先说明计划。
- 修改完成后，对于前端项目验证时如果要跑 build，需要先询问。

## 编辑前代码规则速查

这些规则来自根目录 `.editorconfig`、`oxfmt.config.ts`、`oxlint.config.ts`、`eslint.config.mjs` 以及 `internal/lint-configs/*`。修改代码前先按这些规则写，避免反复靠 `pnpm lint`、`pnpm format` 发现机械问题。

- 基础格式：UTF-8、LF、2 空格缩进、文件末尾换行、移除尾随空格；Markdown 可保留行尾空格。
- 行宽：`.editorconfig` 的 `max_line_length` 是 100，`oxfmt` 的 `printWidth` 是 80；写代码时尽量让格式化结果自然换行，不手工制造超长行。
- TS/Vue：使用单引号、分号、尾随逗号；JSON/JSONC 不写尾随逗号。
- import：类型导入使用顶层 `import type`，禁止重复 import；按类型、Vue、`@vben/*`、`@vben-core/*`、外部包、内部别名、相对路径、副作用/样式分组，组间空行，组内自然升序。
- Vue SFC：块顺序为 `script`、`template`、`style`；宏顺序为 `defineOptions`、`defineProps`、`defineEmits`、`defineSlots`；组件名和模板组件使用 PascalCase。
- Vue 模板：HTML 属性使用双引号；props 使用 camelCase；自定义事件名使用 camelCase，模板事件用连字符；组件标签自闭合，普通 HTML 非 void 标签不自闭合。
- 代码习惯：删除未使用导入和变量；不用 `console.log` 和 `debugger`；仅保留必要的 `console.warn`、`console.error`；避免非空断言 `!`、`require` 和三斜线引用。
- 配置文件：`package.json` 的顶层 key、依赖 key、`files` 等数组保持排序；新增依赖优先使用 `catalog:` 或 workspace 现有写法；YAML 使用 2 空格缩进和单引号。
- import 边界：`apps/**` 不直接引 `#/api/*`、`#/layouts/*`、`#/locales/*`、`#/stores/*`；`packages/@core/**` 不引 `@vben/*`；基础包如 `packages/utils`、`packages/types`、`packages/icons`、`packages/constants`、`packages/styles`、`packages/stores`、`packages/preferences`、`packages/locales` 不引 `@vben/*`。

## 减少重复检查建议

- 小改动先按上面的速查规则手工对齐，不主动跑全量 `pnpm format`。
- 只格式化改过的文件时，优先使用 `pnpm exec oxfmt <file...>`。
- 只有提交前、公共 API/类型变化、跨包改动、规则不确定时，再跑 `pnpm lint` 和 `pnpm check:type`。
- 提交前如果运行过 `pnpm format` 或手动修复过格式/类型问题，必须重新暂存。

## 提交前检查流程

本仓库的 `pre-commit` 会运行 `pnpm lint` 和 `pnpm check:type`。提交前优先按以下流程处理，避免格式化结果没有进入暂存区导致 hook 继续检查旧内容。

1. 确认使用 `.node-version` 对应的 Node 环境。

   ```powershell
   node -v
   pnpm -v
   ```

2. 先运行自动格式化。

   ```powershell
   pnpm format
   ```

3. 如果 `pnpm format` 失败，按输出修复剩余 lint/type 问题，再重新运行格式化或对应检查。

4. 本地验证。

   ```powershell
   pnpm lint
   pnpm check:type
   ```

   如果 `pnpm check:type` 因 `vue-tsc` 并发导致内存不足，可临时增加 Node 内存后重试：

   ```powershell
   $env:NODE_OPTIONS='--max-old-space-size=8192'
   pnpm check:type
   ```

5. 格式化或手动修复后必须重新暂存。

   ```powershell
   git add -A
   ```

6. 提交前可直接模拟 hook。

   ```powershell
   .\node_modules\.bin\lefthook.CMD run pre-commit
   ```

## 注意事项

- 不要用 `--no-verify` 作为常规修复方式；它只能作为临时应急。
- 不要修改 `lefthook.yml` 来绕过格式化或类型检查。
- `pnpm exec lefthook` 在部分 Windows shell 中可能解析不到本地 bin，可直接使用 `.\node_modules\.bin\lefthook.CMD`。
