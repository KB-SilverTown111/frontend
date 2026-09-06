<script setup>
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const selectedService = ref('transfer')

function selectService(service) {
  selectedService.value = service
}

function startVoiceTransfer() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-transfer'))
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell transfer-device">
      <header class="app-header">
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
        <strong class="app-brand">귀편한 금융</strong>
        <Button
          aria-label="음성 도움"
          class="app-header-button transfer-mic-button"
          size="icon"
          variant="secondary"
          @click="startVoiceTransfer"
        >
          <span
            aria-hidden="true"
            class="transfer-mic-icon"
          >
            <span class="transfer-mic-stem" />
          </span>
        </Button>
      </header>

      <main class="app-main transfer-main">
        <section class="screen-heading transfer-heading">
          <span class="transfer-kicker">송금 · 홈</span>
          <h1>홈</h1>
          <p>잔액과 핵심 서비스만 단순하게 보여줍니다.</p>
        </section>

        <div class="transfer-content">
          <Card class="transfer-balance-card">
            <CardContent class="transfer-balance-content">
              <span
                aria-hidden="true"
                class="transfer-status-icon"
              >
                ✓
              </span>
              <div>
                <h2>사용 가능 금액</h2>
                <p>1,240,000원</p>
              </div>
            </CardContent>
          </Card>

          <div
            aria-label="주요 서비스"
            class="transfer-choice-grid"
            role="group"
          >
            <Button
              :aria-pressed="selectedService === 'transfer'"
              class="transfer-choice"
              :class="{ selected: selectedService === 'transfer' }"
              variant="secondary"
              @click="selectService('transfer')"
            >
              <span>송금하기</span>
              <b v-if="selectedService === 'transfer'">✓</b>
            </Button>
            <Button
              :aria-pressed="selectedService === 'bills'"
              class="transfer-choice"
              :class="{ selected: selectedService === 'bills' }"
              variant="secondary"
              @click="selectService('bills')"
            >
              <span>고지서 확인</span>
              <b v-if="selectedService === 'bills'">✓</b>
            </Button>
          </div>
        </div>
      </main>

      <footer class="app-actions transfer-actions">
        <Button
          class="w-full"
          @click="startVoiceTransfer"
        >
          음성으로 송금
        </Button>
      </footer>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav three-items transfer-bottom-nav"
      >
        <RouterLink
          :to="{ name: 'transfer-home' }"
          aria-current="page"
        >
          홈
        </RouterLink>
        <RouterLink :to="{ name: 'bills-home' }">고지서</RouterLink>
        <RouterLink :to="{ name: 'living-home' }">생활금융</RouterLink>
      </nav>
    </article>
  </div>
</template>
