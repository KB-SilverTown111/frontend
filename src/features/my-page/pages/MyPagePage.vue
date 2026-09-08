<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { FONT_SCALE, readFontScale } from '@/shared/services/fontScale.js'
import { useOnboardingStore } from '@/features/onboarding/stores/onboarding.js'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const fontScale = readFontScale()
const fontScaleLabel = computed(() => (fontScale === FONT_SCALE.large ? '큰 글씨' : '기본 크기'))
const isLoggingOut = ref(false)

async function handleLogout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    await onboardingStore.logout()
    await router.replace({ name: 'onboarding', params: { stepId: 'login' } })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell my-page-device">
      <header class="app-header">
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
        <strong class="app-brand">귀편한 금융</strong>
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
      </header>

      <main class="app-main my-page-main">
        <section class="screen-heading my-page-heading">
          <h1>마이페이지</h1>
          <p>보기 편한 환경과 나의 설정을 관리합니다.</p>
        </section>

        <div class="my-page-card-list">
          <RouterLink
            aria-label="글씨 크기 설정 열기"
            class="my-page-card"
            :to="{ name: 'my-page-font-size' }"
          >
            <span>
              <strong>글씨 크기</strong>
              <small>{{ fontScaleLabel }}</small>
            </span>
            <b aria-hidden="true">›</b>
          </RouterLink>
          <RouterLink
            aria-label="목소리 변경 열기"
            class="my-page-card"
            :to="{
              name: 'my-page-voice',
              params: { screenKey: 'voice-voice-select' },
            }"
          >
            <span>
              <strong>목소리 변경</strong>
              <small>안내 음성과 말하기 속도를 바꿉니다.</small>
            </span>
            <b aria-hidden="true">›</b>
          </RouterLink>
          <RouterLink
            aria-label="가입 정보 열기"
            class="my-page-card"
            :to="{
              name: 'living-screen',
              params: { screenKey: 'living-profile-edit' },
            }"
          >
            <span>
              <strong>가입 정보</strong>
              <small>이름과 연락처를 확인합니다.</small>
            </span>
            <b aria-hidden="true">›</b>
          </RouterLink>
          <RouterLink
            aria-label="거래 승인 비밀번호 설정 열기"
            class="my-page-card"
            :to="{ name: 'transfer-pin' }"
          >
            <span>
              <strong>거래 승인 비밀번호</strong>
              <small>송금할 때 쓰는 숫자 6자리를 정합니다.</small>
            </span>
            <b aria-hidden="true">›</b>
          </RouterLink>
          <button
            :aria-busy="isLoggingOut"
            :aria-label="isLoggingOut ? '로그아웃 중' : '로그아웃'"
            class="my-page-card my-page-logout"
            :disabled="isLoggingOut"
            type="button"
            @click="handleLogout"
          >
            <span>
              <strong>{{ isLoggingOut ? '로그아웃 중…' : '로그아웃' }}</strong>
              <small>현재 기기에서 안전하게 로그아웃합니다.</small>
            </span>
            <b aria-hidden="true">↪</b>
          </button>
        </div>
      </main>

      <nav
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
