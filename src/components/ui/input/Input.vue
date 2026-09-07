<script setup>
import { computed, useAttrs } from 'vue'

import { cn } from '@/lib/utils'

defineOptions({ name: 'UiInput', inheritAttrs: false })

const props = defineProps({
  class: { type: [String, Array, Object], default: undefined },
  modelValue: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const classes = computed(() =>
  cn(
    'flex min-h-16 w-full rounded-xl border-2 bg-card px-4 py-3 text-[length:var(--font-size-body)] text-foreground shadow-sm focus-visible:border-primary focus-visible:bg-muted focus-visible:shadow-[inset_0_0_0_1px_var(--primary)] focus-visible:outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    props.class,
  ),
)
</script>

<template>
  <input
    v-bind="attrs"
    :class="classes"
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
