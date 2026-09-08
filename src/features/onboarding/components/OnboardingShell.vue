<script setup>
import { Button } from '@/shared/components/ui/button'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  primaryLabel: { type: String, default: '다음' },
  secondaryLabel: { type: String, default: '' },
  busy: Boolean,
  hideBack: Boolean,
  progress: { type: Object, default: null },
  bottomNav: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
})

defineEmits(['back', 'home', 'bills', 'living', 'mypage', 'primary', 'secondary'])
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
        <div
          v-if="progress"
          class="onboarding-progress"
          role="progressbar"
          :aria-label="`가입 진행 ${progress.current}단계 / ${progress.total}단계`"
          :aria-valuemax="progress.total"
          aria-valuemin="0"
          :aria-valuenow="progress.current"
        >
          <div class="onboarding-progress-track">
            <span
              class="onboarding-progress-value"
              :style="{ width: `${(progress.current / progress.total) * 100}%` }"
            />
          </div>
          <span class="onboarding-progress-label">
            {{ progress.current }} / {{ progress.total }}
          </span>
        </div>

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
      </main>

      <nav
        v-if="bottomNav"
        class="app-bottom-nav"
        :class="{ 'four-items': bottomNav === 'service' }"
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
        <button
          v-if="bottomNav === 'service'"
          type="button"
          @click="$emit('mypage')"
        >
          <span>●</span>마이페이지
        </button>
      </nav>
    </article>
  </div>
</template>
