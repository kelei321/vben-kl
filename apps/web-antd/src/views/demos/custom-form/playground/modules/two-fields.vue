<script lang="ts" setup>
import { Input, Select } from 'ant-design-vue';

const emit = defineEmits<{
  blur: [];
  change: [value: [string | undefined, string | undefined]];
}>();

const modelValue = defineModel<[string | undefined, string | undefined]>({
  default: () => [undefined, undefined],
});

function updateAt(index: 0 | 1, value: unknown) {
  const normalizedValue =
    typeof value === 'number' || typeof value === 'string'
      ? String(value)
      : undefined;
  const current = modelValue.value ?? [undefined, undefined];
  if (current[index] === normalizedValue) {
    return;
  }
  const next = [...current] as [string | undefined, string | undefined];
  next[index] = normalizedValue;
  modelValue.value = next;
  emit('change', next);
}
</script>

<template>
  <div class="flex w-full gap-1">
    <Select
      allow-clear
      class="w-24"
      placeholder="类型"
      :options="[
        { label: '个人', value: 'personal' },
        { label: '工作', value: 'work' },
        { label: '私密', value: 'private' },
      ]"
      :value="modelValue?.[0]"
      @blur="emit('blur')"
      @update:value="(value) => updateAt(0, value)"
    />
    <Input
      allow-clear
      class="flex-1"
      :maxlength="11"
      placeholder="请输入 11 位手机号"
      type="tel"
      :value="modelValue?.[1]"
      @blur="emit('blur')"
      @update:value="(value) => updateAt(1, value)"
    />
  </div>
</template>
