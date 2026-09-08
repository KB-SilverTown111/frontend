<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

defineOptions({ name: 'UiBadge' })

const props = defineProps({
  class: { type: [String, Array, Object], default: undefined },
  variant: { type: String, default: 'default' },
})

const variants = cva('inline-flex min-h-9 items-center rounded-full px-3 text-sm font-extrabold', {
  variants: {
    variant: {
      default: 'bg-accent text-accent-foreground',
      success: 'bg-muted text-[#315a49]',
      destructive: 'bg-[#fff0ef] text-destructive',
      outline: 'border-2 bg-card text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

const classes = computed(() => cn(variants({ variant: props.variant }), props.class))
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
