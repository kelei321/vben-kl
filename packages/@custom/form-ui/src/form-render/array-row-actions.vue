<script setup lang="ts">
import { ArrowDown, ArrowUp, Copy, X } from '@vben-core/icons';
import { Button } from '@vben-core/shadcn-ui';

interface Props {
  actions: {
    copy: (index: number) => void;
    move: (from: number, to: number) => void;
    remove: (index: number) => void;
  };
  arraySchema: any;
  canAdd: boolean;
  canRemove: boolean;
  isDisabled: boolean;
  rowsLength: number;
  rowState: any;
}

defineProps<Props>();
</script>

<template>
  <div class="flex shrink-0 items-center gap-1">
    <Button
      v-if="arraySchema.sortable"
      aria-label="上移"
      :disabled="isDisabled || rowState.rowIndex === 0"
      size="icon"
      title="上移"
      type="button"
      variant="ghost"
      @click="actions.move(rowState.rowIndex, rowState.rowIndex - 1)"
    >
      <ArrowUp class="size-4" />
    </Button>
    <Button
      v-if="arraySchema.sortable"
      aria-label="下移"
      :disabled="isDisabled || rowState.rowIndex === rowsLength - 1"
      size="icon"
      title="下移"
      type="button"
      variant="ghost"
      @click="actions.move(rowState.rowIndex, rowState.rowIndex + 1)"
    >
      <ArrowDown class="size-4" />
    </Button>
    <Button
      v-if="arraySchema.copyable"
      aria-label="复制"
      :disabled="!canAdd"
      size="icon"
      title="复制"
      type="button"
      variant="ghost"
      @click="actions.copy(rowState.rowIndex)"
    >
      <Copy class="size-4" />
    </Button>
    <Button
      :aria-label="arraySchema.removeButtonText ?? '删除'"
      :disabled="!canRemove"
      size="icon"
      :title="arraySchema.removeButtonText ?? '删除'"
      type="button"
      variant="ghost"
      @click="actions.remove(rowState.rowIndex)"
    >
      <X class="size-4" />
    </Button>
  </div>
</template>
