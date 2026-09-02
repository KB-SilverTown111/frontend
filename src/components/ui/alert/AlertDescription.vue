<script setup>
import { cn } from '@/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <div :class="cn('text-sm leading-relaxed', $props.class)">
    <slot />
  </div>
</template>
