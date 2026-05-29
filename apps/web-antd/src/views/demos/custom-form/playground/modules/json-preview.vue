<script lang="ts" setup>
import dayjs from 'dayjs';

interface Props {
  title?: string;
  value?: unknown;
}

defineProps<Props>();

function formatValue(value: unknown) {
  return JSON.stringify(
    value ?? {},
    (_key, currentValue) => {
      return dayjs.isDayjs(currentValue)
        ? currentValue.format('YYYY-MM-DD HH:mm:ss')
        : currentValue;
    },
    2,
  );
}
</script>

<template>
  <div>
    <div v-if="title" class="mb-2 text-sm font-medium">{{ title }}</div>
    <pre
      class="bg-muted text-muted-foreground max-h-80 overflow-auto rounded-md p-4 text-xs"
      >{{ formatValue(value) }}
    </pre>
  </div>
</template>
