<script setup>
import { cn } from '@/shared/lib/utils'

defineOptions({ name: 'UiCard' })

defineProps({ class: { type: [String, Array, Object], default: undefined } })
</script>

<template>
  <div :class="cn('rounded-xl border-2 bg-card text-card-foreground shadow-sm', $props.class)">
    <slot />
  </div>
</template>
