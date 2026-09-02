<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

defineOptions({ name: 'UiButton' })

const props = defineProps({
  as: { type: String, default: 'button' },
  class: { type: [String, Array, Object], default: undefined },
  disabled: Boolean,
  size: { type: String, default: 'default' },
  variant: { type: String, default: 'default' },
})

const variants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border bg-secondary text-secondary-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: {
        default: 'min-h-14 px-6 text-[17px]',
        sm: 'min-h-11 px-4 text-[15px]',
        icon: 'size-12 rounded-full text-xl',
      },
    },
    defaultVariants: { size: 'default', variant: 'default' },
  },
)

const classes = computed(() =>
  cn(variants({ size: props.size, variant: props.variant }), props.class),
)
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :disabled="as === 'button' ? disabled : undefined"
    :type="as === 'button' ? 'button' : undefined"
  >
    <slot />
  </component>
</template>
