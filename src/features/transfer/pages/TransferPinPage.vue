<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from '@/shared/components/ui/button'
import { useTransferStore } from '@/features/transfer/stores/transfer.js'

const route = useRoute()
const router = useRouter()
const transferStore = useTransferStore()

const cameFromTransfer = computed(() => route.query.from === 'transfer')

/** 송금 도중 들어왔으면 인증 화면으로, 그 밖에는 마이페이지로 돌아간다. */
const backRoute = computed(() => {
  if (!cameFromTransfer.value) return { name: 'my-page' }
  if (!transferStore.transferId) return { name: 'transfer-home' }
  return {
    name: 'transfer-screen',
    params: { screenKey: 'transfer-guardian-confirm' },
  }
})

const pin = ref('')
const pinConfirm = ref('')
const saving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

const canSubmit = computed(() => pin.value.length === 6 && pinConfirm.value.length === 6)

function onlyDigits(value) {
  return String(value ?? '')
    .replace(/[^0-9]/g, '')
    .slice(0, 6)
}

function normalizePin() {
  pin.value = onlyDigits(pin.value)
}

function normalizePinConfirm() {
  pinConfirm.value = onlyDigits(pinConfirm.value)
}

/** 입력한 비밀번호는 화면을 벗어날 때 남기지 않는다. */
function clearPins() {
  pin.value = ''
  pinConfirm.value = ''
}

async function handleSubmit() {
  if (saving.value) return

  errorMessage.value = ''
  savedMessage.value = ''

  if (!/^\d{6}$/.test(pin.value)) {
    errorMessage.value = '비밀번호를 숫자 6자리로 입력해 주세요.'
    return
  }
  if (pin.value !== pinConfirm.value) {
    errorMessage.value = '두 번 입력한 비밀번호가 서로 달라요. 다시 입력해 주세요.'
    pinConfirm.value = ''
    return
  }

  saving.value = true
  try {
    await transferStore.registerPin(pin.value)
    savedMessage.value = '거래 승인 비밀번호를 저장했어요.'
  } catch (error) {
    errorMessage.value = error.message || '비밀번호를 저장하지 못했어요. 잠시 후 다시 해주세요.'
  } finally {
    clearPins()
    saving.value = false
  }
}

function goBack() {
  clearPins()
  return router.push(backRoute.value)
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell my-page-device">
      <header class="app-header">
        <Button
          aria-label="이전 화면으로 돌아가기"
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
          <h1>거래 승인 비밀번호</h1>
          <p>송금할 때 쓰는 숫자 6자리를 정해 주세요.</p>
        </section>

        <form
          class="transfer-pin-form"
          @submit.prevent="handleSubmit"
        >
          <label class="service-route-input-field">
            <span>새 비밀번호 (숫자 6자리)</span>
            <input
              v-model="pin"
              autocomplete="new-password"
              inputmode="numeric"
              maxlength="6"
              placeholder="숫자 6자리"
              type="password"
              @input="normalizePin"
            />
          </label>

          <label class="service-route-input-field">
            <span>한 번 더 입력</span>
            <input
              v-model="pinConfirm"
              autocomplete="new-password"
              inputmode="numeric"
              maxlength="6"
              placeholder="숫자 6자리"
              type="password"
              @input="normalizePinConfirm"
              @keyup.enter="handleSubmit"
            />
          </label>

          <p class="transfer-pin-guide">비밀번호는 기기에 남기지 않고 은행에만 보냅니다.</p>

          <p
            v-if="errorMessage"
            class="service-route-error transfer-pin-error"
            role="alert"
          >
            {{ errorMessage }}
          </p>
          <p
            v-if="savedMessage"
            class="transfer-pin-saved"
            role="status"
          >
            {{ savedMessage }}
          </p>

          <Button
            v-if="!savedMessage"
            :aria-busy="saving"
            class="service-route-primary transfer-pin-submit"
            :disabled="!canSubmit || saving"
            @click="handleSubmit"
          >
            {{ saving ? '저장 중…' : '비밀번호 저장' }}
          </Button>
          <Button
            v-else
            class="service-route-primary transfer-pin-submit"
            @click="goBack"
          >
            {{ cameFromTransfer ? '송금 계속하기' : '마이페이지로' }}
          </Button>
        </form>
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
