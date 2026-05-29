# Project Instructions

- 默认使用中文回答。
- 修改代码前，先说明计划。
- 修改完成后，对于前端项目验证时如果要跑 build，需要先询问。

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
