<script setup>
import { computed } from 'vue'

import { FONT_SCALE, readFontScale } from '@/services/fontScale.js'

const fontScale = readFontScale()
const fontScaleLabel = computed(() => (fontScale === FONT_SCALE.large ? '큰 글씨' : '기본 크기'))
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
            aria-label="가입 정보 열기"
            class="my-page-card"
            :to="{ name: 'living-screen', params: { screenId: '4-14' } }"
          >
            <span>
              <strong>가입 정보</strong>
              <small>이름과 연락처를 확인합니다.</small>
            </span>
            <b aria-hidden="true">›</b>
          </RouterLink>
        </div>
      </main>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items my-page-bottom-nav"
      >
        <RouterLink :to="{ name: 'transfer-home' }">홈</RouterLink>
        <RouterLink :to="{ name: 'bills-home' }">고지서</RouterLink>
        <RouterLink :to="{ name: 'living-home' }">생활금융</RouterLink>
        <RouterLink
          aria-current="page"
          :to="{ name: 'my-page' }"
        >
          마이페이지
        </RouterLink>
      </nav>
    </article>
  </div>
</template>
