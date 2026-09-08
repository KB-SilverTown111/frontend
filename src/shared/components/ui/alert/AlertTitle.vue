<script setup>
import { cn } from '@/shared/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <h4
    :class="
      cn('mb-2 text-[length:var(--font-size-action)] font-extrabold leading-tight', $props.class)
    "
  >
    <slot />
  </h4>
</template>
