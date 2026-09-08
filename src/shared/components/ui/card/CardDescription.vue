<script setup>
import { cn } from '@/shared/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <p
    :class="
      cn('text-[length:var(--font-size-body)] leading-relaxed text-muted-foreground', $props.class)
    "
  >
    <slot />
  </p>
</template>
