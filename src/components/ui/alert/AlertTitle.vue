<script setup>
import { cn } from '@/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <h4 :class="cn('mb-1 font-bold leading-none', $props.class)">
    <slot />
  </h4>
</template>
