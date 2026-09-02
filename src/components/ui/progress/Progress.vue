<script setup>
import { computed } from 'vue'

import { cn } from '@/lib/utils'

defineOptions({ name: 'UiProgress' })

const props = defineProps({
  class: { type: [String, Array, Object], default: undefined },
  max: { type: Number, default: 100 },
  value: { type: Number, default: 0 },
})

const percent = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))
</script>

<template>
  <div
    :class="cn('h-2 w-full overflow-hidden rounded-full bg-[#e6dfbd]', props.class)"
    role="progressbar"
    :aria-valuemax="max"
    aria-valuemin="0"
    :aria-valuenow="value"
  >
    <div
      class="h-full rounded-full bg-primary transition-[width]"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
