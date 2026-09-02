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
    'flex min-h-14 w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
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
