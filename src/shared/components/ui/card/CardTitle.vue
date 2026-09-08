<script setup>
import { cn } from '@/shared/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <h3 :class="cn('text-2xl font-extrabold leading-tight', $props.class)">
    <slot />
  </h3>
</template>
