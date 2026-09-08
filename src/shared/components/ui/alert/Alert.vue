<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

defineOptions({ name: 'UiAlert' })

const props = defineProps({
  class: { type: [String, Array, Object], default: undefined },
  variant: { type: String, default: 'default' },
})

const variants = cva(
  'relative w-full rounded-xl border-2 p-5 text-[length:var(--font-size-body)] leading-relaxed',
  {
    variants: {
      variant: {
        default: 'bg-card text-foreground',
        success: 'border-primary bg-muted text-[#315a49]',
        warning: 'border-[#efd67b] bg-[#fff9df] text-[#6a5a18]',
        destructive: 'border-[#edb8b4] bg-[#fff0ef] text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const classes = computed(() => cn(variants({ variant: props.variant }), props.class))
</script>

<template>
  <div
    :class="classes"
    role="alert"
  >
    <slot />
  </div>
</template>
