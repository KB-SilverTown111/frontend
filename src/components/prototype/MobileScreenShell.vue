<script setup>
import { Button } from '@/components/ui/button'

defineProps({
  primaryLabel: { type: String, default: '' },
  secondaryLabel: { type: String, default: '' },
  showHelp: { type: Boolean, default: true },
  showTabs: { type: Boolean, default: false },
})

defineEmits(['back', 'help', 'primary', 'secondary'])
</script>

<template>
  <div class="prototype-stage">
    <article class="prototype-device">
      <header class="prototype-nav">
        <Button
          aria-label="이전 화면"
          class="prototype-nav-button"
          size="icon"
          variant="secondary"
          @click="$emit('back')"
        >
          ‹
        </Button>
        <strong class="prototype-brand">귀편한 금융</strong>
        <Button
          v-if="showHelp"
          aria-label="도움말"
          class="prototype-help-button"
          size="icon"
          variant="secondary"
          @click="$emit('help')"
        >
          ?
        </Button>
        <span
          v-else
          class="size-12"
          aria-hidden="true"
        />
      </header>

      <main class="prototype-main">
        <slot />
      </main>

      <footer
        v-if="primaryLabel || secondaryLabel"
        class="prototype-actions"
      >
        <Button
          v-if="primaryLabel"
          class="w-full"
          @click="$emit('primary')"
        >
          {{ primaryLabel }}
        </Button>
        <Button
          v-if="secondaryLabel"
          class="w-full"
          variant="secondary"
          @click="$emit('secondary')"
        >
          {{ secondaryLabel }}
        </Button>
      </footer>

      <nav
        v-if="showTabs"
        class="prototype-tabs"
        aria-label="주요 메뉴"
      >
        <RouterLink
          :to="{ name: 'prototype-screen', params: { flow: 'transfer', screenId: '2-01' } }"
        >
          홈
        </RouterLink>
        <RouterLink :to="{ name: 'prototype-screen', params: { flow: 'bills', screenId: '3-01' } }">
          고지서
        </RouterLink>
        <RouterLink
          :to="{ name: 'prototype-screen', params: { flow: 'living', screenId: '4-01' } }"
        >
          생활금융
        </RouterLink>
      </nav>
    </article>
  </div>
</template>
