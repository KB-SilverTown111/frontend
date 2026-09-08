<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from '@/shared/components/ui/button'
import { goBackOrReplace } from '@/shared/lib/navigation.js'
import {
  FONT_SCALE,
  applyFontScale,
  readFontScale,
  saveFontScale,
} from '@/shared/services/fontScale.js'

const route = useRoute()
const router = useRouter()
const isLoginFontSize = computed(() => route.name === 'font-size')
const backRoute = computed(() =>
  isLoginFontSize.value ? { name: 'onboarding', params: { stepId: 'login' } } : { name: 'my-page' },
)
const fontScale = ref(readFontScale())
applyFontScale(fontScale.value)

function setFontScale(value) {
  fontScale.value = saveFontScale(value)
  applyFontScale(fontScale.value)
}

function goBack() {
  return goBackOrReplace(router, backRoute.value)
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell my-page-device">
      <header class="app-header">
        <Button
          :aria-label="isLoginFontSize ? '로그인으로 돌아가기' : '마이페이지로 돌아가기'"
          class="app-back-button"
          size="icon"
          variant="secondary"
          @click="goBack"
        >
          ‹
        </Button>
        <strong class="app-brand">귀편한 금융</strong>
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
      </header>

      <main class="app-main my-page-main">
        <section class="screen-heading my-page-heading">
          <h1>글씨 크기</h1>
          <p>화면을 보기 편한 크기로 선택해 주세요.</p>
        </section>

        <fieldset class="font-size-picker">
          <legend>글씨 크기 선택</legend>
          <div
            class="font-size-options"
            role="group"
            aria-label="글씨 크기 선택"
          >
            <button
              :aria-pressed="fontScale === FONT_SCALE.standard"
              class="font-size-option"
              :class="{ selected: fontScale === FONT_SCALE.standard }"
              type="button"
              @click="setFontScale(FONT_SCALE.standard)"
            >
              기본 크기
            </button>
            <button
              :aria-pressed="fontScale === FONT_SCALE.large"
              class="font-size-option font-size-option-large"
              :class="{ selected: fontScale === FONT_SCALE.large }"
              type="button"
              @click="setFontScale(FONT_SCALE.large)"
            >
              큰 글씨
            </button>
          </div>
        </fieldset>
      </main>

      <nav
        v-if="!isLoginFontSize"
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items my-page-bottom-nav"
      >
        <RouterLink
          replace
          :to="{ name: 'transfer-home' }"
          >홈</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'bills-home' }"
          >고지서</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'living-home' }"
          >생활금융</RouterLink
        >
        <RouterLink
          replace
          aria-current="page"
          :to="{ name: 'my-page' }"
        >
          마이페이지
        </RouterLink>
      </nav>
    </article>
  </div>
</template>
