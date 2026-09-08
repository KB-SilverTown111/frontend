<script setup>
import { cn } from '@/shared/lib/utils'

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5 p-6', $props.class)">
    <slot />
  </div>
</template>
