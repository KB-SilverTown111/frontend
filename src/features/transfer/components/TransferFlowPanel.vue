<script setup>
import { computed, onMounted } from 'vue'

import { Button } from '@/shared/components/ui/button'
import { useServiceDataStore } from '@/features/living/stores/serviceData.js'
import { useTransferStore } from '@/features/transfer/stores/transfer.js'

const props = defineProps({
  screenKey: {
    type: String,
    default: '',
  },
})

const transferStore = useTransferStore()
const serviceData = useServiceDataStore()

const RECIPIENT_SCREENS = ['transfer-recipient-select', 'transfer-recipient-confirm']
const ACCOUNT_SCREENS = ['transfer-account-select']
const AMOUNT_SCREENS = ['transfer-amount-confirm']
const CONFIRM_SCREENS = ['transfer-confirm']
const RESULT_SCREENS = ['transfer-complete', 'transfer-failed']

const showRecipients = computed(() => RECIPIENT_SCREENS.includes(props.screenKey))
const showAccounts = computed(() => ACCOUNT_SCREENS.includes(props.screenKey))
const showAmount = computed(() => AMOUNT_SCREENS.includes(props.screenKey))
const showConfirm = computed(() => CONFIRM_SCREENS.includes(props.screenKey))
const showResult = computed(() => RESULT_SCREENS.includes(props.screenKey))
const showFailure = computed(() => props.screenKey === 'transfer-failed')

const accounts = computed(() => serviceData.accounts ?? [])
const candidates = computed(() => transferStore.candidates ?? [])
const prepared = computed(() => transferStore.prepared)
const result = computed(() => transferStore.result)
const failureMessage = computed(
  () =>
    transferStore.error?.message ||
    result.value?.message ||
    '은행에서 처리하지 못했어요. 돈은 그대로 있으니 안심하세요.',
)

const amountText = computed({
  get: () => (transferStore.draftAmount ? String(transferStore.draftAmount) : ''),
  set: (value) => transferStore.setAmount(value),
})

const amountCandidates = computed(() => transferStore.validation?.amountCandidates ?? [])

function formatAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '금액 확인 중'
}

function accountLabel(account) {
  const name = account?.accountName || account?.accountType || '계좌'
  return `${name} · ${account?.accountNumberMasked ?? ''}`.trim()
}

function recipientLabel(candidate) {
  const parts = [candidate?.displayName, candidate?.relationship, candidate?.accountNumberMasked]
  return parts.filter(Boolean).join(' · ')
}

onMounted(() => {
  if (showAccounts.value && !accounts.value.length) {
    serviceData.loadAccounts({ active: true }).catch(() => {})
  }
})
</script>

<template>
  <section
    aria-label="송금 진행"
    class="flex flex-col gap-5 rounded-[28px] bg-card p-6"
  >
    <div
      v-if="showRecipients"
      aria-label="받는 분 고르기"
      class="flex flex-col gap-3"
      role="radiogroup"
    >
      <strong class="text-[15px]">받는 분을 골라주세요</strong>

      <p
        v-if="!candidates.length"
        class="text-lg leading-relaxed"
      >
        아직 찾은 분이 없어요. 아래 단추로 다시 찾아주세요.
      </p>

      <button
        v-for="candidate in candidates"
        :key="candidate.recipientId"
        :aria-checked="transferStore.selectedRecipient?.recipientId === candidate.recipientId"
        class="flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-5 text-left text-lg"
        :class="
          transferStore.selectedRecipient?.recipientId === candidate.recipientId
            ? 'border-primary bg-muted font-bold'
            : ''
        "
        role="radio"
        type="button"
        @click="transferStore.selectRecipient(candidate)"
      >
        <span>{{ recipientLabel(candidate) }}</span>
        <b v-if="transferStore.selectedRecipient?.recipientId === candidate.recipientId">✓</b>
      </button>
    </div>

    <div
      v-if="showAccounts"
      aria-label="출금 계좌 고르기"
      class="flex flex-col gap-3"
      role="radiogroup"
    >
      <strong class="text-[15px]">어느 계좌에서 보낼까요</strong>

      <p
        v-if="serviceData.loading.accounts"
        class="text-lg"
      >
        계좌를 불러오는 중이에요.
      </p>
      <p
        v-else-if="!accounts.length"
        class="text-lg leading-relaxed"
      >
        사용할 수 있는 계좌가 없어요.
      </p>

      <button
        v-for="account in accounts"
        :key="account.accountId"
        :aria-checked="transferStore.fromAccount?.accountId === account.accountId"
        class="flex min-h-16 flex-col items-start justify-center gap-1 rounded-2xl border px-5 py-3 text-left"
        :class="
          transferStore.fromAccount?.accountId === account.accountId
            ? 'border-primary bg-muted font-bold'
            : ''
        "
        role="radio"
        type="button"
        @click="transferStore.selectAccount(account)"
      >
        <span class="text-lg">{{ accountLabel(account) }}</span>
        <span class="text-[15px] text-muted-foreground">{{ formatAmount(account.balance) }}</span>
      </button>
    </div>

    <div
      v-if="showAmount"
      class="flex flex-col gap-3"
    >
      <label
        class="text-[15px] font-semibold"
        for="transfer-amount"
      >
        보내실 금액을 적어주세요
      </label>
      <input
        id="transfer-amount"
        v-model="amountText"
        class="min-h-16 rounded-2xl border px-5 text-2xl font-bold"
        inputmode="numeric"
        maxlength="12"
        placeholder="예: 50000"
        type="text"
      />
      <p
        v-if="transferStore.draftAmount"
        class="text-xl font-bold"
      >
        {{ formatAmount(transferStore.draftAmount) }}
      </p>

      <div
        v-if="transferStore.amountReconfirmRequired && amountCandidates.length"
        class="flex flex-col gap-3 rounded-2xl bg-muted p-4"
        role="radiogroup"
        aria-label="금액 다시 고르기"
      >
        <strong class="text-[15px]">어느 금액이 맞나요</strong>
        <Button
          v-for="value in amountCandidates"
          :key="value"
          class="w-full"
          variant="secondary"
          @click="transferStore.setAmount(value)"
        >
          {{ formatAmount(value) }}
        </Button>
      </div>
    </div>

    <div
      v-if="showConfirm && prepared"
      aria-label="보내는 내용 확인"
      class="flex flex-col gap-3 rounded-2xl border p-5"
    >
      <strong class="text-[15px]">이대로 보낼까요</strong>
      <div class="flex items-baseline justify-between gap-3 text-xl">
        <span>받는 분</span>
        <b>{{ prepared.recipient?.displayName || transferStore.recipientName || '확인 중' }}</b>
      </div>
      <div class="flex items-baseline justify-between gap-3 text-2xl">
        <span>보내는 금액</span>
        <b>{{ formatAmount(prepared.amount ?? transferStore.amount) }}</b>
      </div>
      <div class="flex items-baseline justify-between gap-3 text-xl">
        <span>출금 계좌</span>
        <b>{{ accountLabel(transferStore.fromAccount) }}</b>
      </div>
      <p
        v-if="prepared.confirmationText"
        class="text-lg leading-relaxed"
      >
        {{ prepared.confirmationText }}
      </p>
    </div>

    <div
      v-if="showResult"
      class="flex flex-col gap-3 rounded-2xl border p-5"
    >
      <template v-if="showFailure">
        <div
          class="flex flex-col gap-2"
          role="alert"
        >
          <strong class="text-xl">송금을 처리하지 못했어요</strong>
          <p class="text-lg leading-relaxed">{{ failureMessage }}</p>
        </div>
        <div
          v-if="result?.amount ?? transferStore.amount"
          class="flex items-baseline justify-between gap-3 text-xl"
        >
          <span>보내려던 금액</span>
          <b>{{ formatAmount(result?.amount ?? transferStore.amount) }}</b>
        </div>
      </template>
      <template v-else-if="result">
        <div class="flex items-baseline justify-between gap-3 text-2xl">
          <span>보낸 금액</span>
          <b>{{ formatAmount(result.amount) }}</b>
        </div>
        <div class="flex items-baseline justify-between gap-3 text-lg">
          <span>상태</span>
          <b>{{ result.status === 'SUCCESS' ? '완료' : result.status }}</b>
        </div>
      </template>
      <p
        v-else
        class="text-lg leading-relaxed"
      >
        아직 보낸 내역이 없어요.
      </p>
    </div>

    <p
      v-if="transferStore.error && !showFailure"
      class="text-[15px] leading-relaxed text-destructive"
      role="alert"
    >
      {{ transferStore.error.message }}
    </p>
  </section>
</template>
