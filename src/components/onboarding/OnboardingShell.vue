<script setup>
import { Button } from '@/components/ui/button'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  primaryLabel: { type: String, default: '다음' },
  secondaryLabel: { type: String, default: '' },
  busy: Boolean,
  hideBack: Boolean,
  bottomNav: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
})

defineEmits(['back', 'home', 'bills', 'living', 'primary', 'secondary'])
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell onboarding-device">
      <header class="app-header">
        <Button
          v-if="!hideBack"
          aria-label="이전 화면"
          class="app-back-button"
          size="icon"
          variant="secondary"
          @click="$emit('back')"
        >
          ‹
        </Button>
        <span
          v-else
          class="app-header-spacer"
          aria-hidden="true"
        />
        <strong class="app-brand">귀편한 금융</strong>
        <span
          class="app-header-spacer"
          aria-hidden="true"
        />
      </header>

      <main class="app-main onboarding-main">
        <section class="screen-heading">
          <h1>{{ title }}</h1>
          <p v-if="description">{{ description }}</p>
        </section>

        <div
          v-if="errorMessage"
          class="onboarding-submit-error"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <slot />
      </main>

      <footer class="app-actions onboarding-actions">
        <slot name="actions">
          <Button
            class="w-full"
            :disabled="busy"
            @click="$emit('primary')"
          >
            {{ busy ? '처리하고 있어요…' : primaryLabel }}
          </Button>
          <Button
            v-if="secondaryLabel"
            class="w-full"
            :disabled="busy"
            variant="secondary"
            @click="$emit('secondary')"
          >
            {{ secondaryLabel }}
          </Button>
        </slot>
      </footer>

      <nav
        v-if="bottomNav"
        class="app-bottom-nav"
        :class="{ 'three-items': bottomNav === 'service' }"
        aria-label="주요 메뉴"
      >
        <button
          aria-current="page"
          type="button"
          @click="$emit('home')"
        >
          <span>⌂</span>홈
        </button>
        <button
          v-if="bottomNav === 'service'"
          type="button"
          @click="$emit('bills')"
        >
          <span>▤</span>고지서
        </button>
        <button
          v-if="bottomNav === 'service'"
          type="button"
          @click="$emit('living')"
        >
          <span>○</span>생활금융
        </button>
      </nav>
    </article>
  </div>
</template>
