<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { withAppLoading } from '@/shared/services/appLoading.js'
import {
  isTransferDraftExpired,
  loadTransferDraft,
} from '@/features/transfer/services/transferDraft.js'
import { useServiceDataStore } from '@/features/living/stores/serviceData.js'
import { useTransferStore } from '@/features/transfer/stores/transfer.js'

const router = useRouter()
const serviceData = useServiceDataStore()
const transferStore = useTransferStore()

const primaryAccount = computed(() => serviceData.accounts[0] || null)
const balanceLabel = computed(() => {
  const balance = Number(primaryAccount.value?.balance)
  if (Number.isFinite(balance)) return `${balance.toLocaleString('ko-KR')}원`
  return serviceData.loading.accounts ? '잔액을 불러오는 중' : '1,240,000원'
})

/**
 * 마무리하지 못한 송금이 있으면 알려준다.
 * 오래 열어둔 초안은 이어서 보내지 않고 시간이 지났음을 알린 뒤 처음부터 다시 하게 한다.
 */
async function checkUnfinishedTransfer() {
  const draft = loadTransferDraft()
  if (!draft) return

  if (isTransferDraftExpired(draft)) {
    transferStore.discardDraft()
    await router.replace({
      name: 'transfer-screen',
      params: { screenKey: 'transfer-expired' },
    })
    return
  }

  const restored = await transferStore.restoreDraft()
  if (!restored) return

  await router.replace({
    name: 'transfer-screen',
    params: { screenKey: 'transfer-existing-plan' },
  })
}

onMounted(() => {
  withAppLoading(() => serviceData.loadAccounts({ active: true }).catch(() => {}))
  checkUnfinishedTransfer().catch(() => {})
})

function startVoiceTransfer() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-transfer'))
  router.push({
    name: 'transfer-screen',
    params: { screenKey: 'transfer-listening' },
  })
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
              :to="{
                name: 'transfer-screen',
                params: { screenKey: 'transfer-listening' },
              }"
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
        <footer class="app-actions transfer-actions">
          <Button
            class="w-full"
            @click="startVoiceTransfer"
          >
            음성으로 송금
          </Button>
        </footer>
      </main>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items transfer-bottom-nav"
      >
        <RouterLink
          replace
          :to="{ name: 'transfer-home' }"
          aria-current="page"
        >
          홈
        </RouterLink>
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
          :to="{ name: 'my-page' }"
          >마이페이지</RouterLink
        >
      </nav>
    </article>
  </div>
</template>
