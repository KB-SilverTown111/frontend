<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

defineOptions({ name: 'UiBadge' })

const props = defineProps({
  class: { type: [String, Array, Object], default: undefined },
  variant: { type: String, default: 'default' },
})

const variants = cva('inline-flex min-h-8 items-center rounded-full px-3 text-[13px] font-bold', {
  variants: {
    variant: {
      default: 'bg-accent text-accent-foreground',
      success: 'bg-muted text-[#315a49]',
      destructive: 'bg-[#fff0ef] text-destructive',
      outline: 'border bg-card text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

const classes = computed(() => cn(variants({ variant: props.variant }), props.class))
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
