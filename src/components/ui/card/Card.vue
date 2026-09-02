<script setup>
import { cn } from '@/lib/utils'

defineOptions({ name: 'UiCard' })

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <div :class="cn('rounded-xl border bg-card text-card-foreground shadow-sm', $props.class)">
    <slot />
  </div>
</template>
