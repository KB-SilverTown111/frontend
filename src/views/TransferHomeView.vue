<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useServiceDataStore } from '@/stores/serviceData.js'

const router = useRouter()
const serviceData = useServiceDataStore()

const primaryAccount = computed(() => serviceData.accounts[0] || null)
const balanceLabel = computed(() => {
  const balance = Number(primaryAccount.value?.balance)
  if (Number.isFinite(balance)) return `${balance.toLocaleString('ko-KR')}원`
  return serviceData.loading.accounts ? '잔액을 불러오는 중' : '1,240,000원'
})

onMounted(() => {
  serviceData.loadAccounts({ active: true }).catch(() => {})
})

function startVoiceTransfer() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-transfer'))
  router.push({ name: 'transfer-screen', params: { screenId: '2-02' } })
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
                <p>{{ balanceLabel }}</p>
              </div>
            </CardContent>
          </Card>

          <p
            v-if="serviceData.errors.accounts"
            class="transfer-data-error"
            role="status"
          >
            잔액을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
          </p>

          <div
            aria-label="주요 서비스"
            class="transfer-choice-grid"
            role="group"
          >
            <RouterLink
              :to="{ name: 'transfer-screen', params: { screenId: '2-02' } }"
              class="transfer-choice"
            >
              <span>송금하기</span>
            </RouterLink>
            <RouterLink
              :to="{ name: 'bills-home' }"
              class="transfer-choice"
            >
              <span>고지서 확인</span>
            </RouterLink>
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
        class="app-bottom-nav four-items transfer-bottom-nav"
      >
        <RouterLink
          :to="{ name: 'transfer-home' }"
          aria-current="page"
        >
          홈
        </RouterLink>
        <RouterLink :to="{ name: 'bills-home' }">고지서</RouterLink>
        <RouterLink :to="{ name: 'living-home' }">생활금융</RouterLink>
        <RouterLink :to="{ name: 'my-page' }">마이페이지</RouterLink>
      </nav>
    </article>
  </div>
</template>
