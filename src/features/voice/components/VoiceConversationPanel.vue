<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/shared/components/ui/button'
import { useVoiceStore } from '@/features/voice/stores/voice.js'

const props = defineProps({
  entryPoint: {
    type: String,
    default: 'GENERAL_FINANCE',
  },
  screenKey: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const voiceStore = useVoiceStore()

const actionError = ref('')
const showKeyboard = ref(false)
const draft = ref('')
const correctionHint = ref('')
/** 카드의 기본 선택. 화면 표시일 뿐이며 승인해야 확정된다. */
const focusedIndex = ref(0)
const ending = ref(false)

/**
 * 합의된 무응답 규칙이다. 15초면 한 번 다시 안내하고, 다시 15초면 흐름을 취소한다.
 * 서버 무응답 타이머는 일반 금융 세션만 대상이라 송금은 화면에서 잰다.
 */
const NO_RESPONSE_MS = 15_000
const END_GUIDANCE_TIMEOUT_MS = 8_000

let noResponseTimer = null
let reannounced = false

/**
 * 서버는 requiredSlot과 draftSummary를 스키마가 정해지지 않은 JSON으로 내려준다.
 * 아는 키만 사람이 읽을 이름으로 바꾸고, 모르는 키는 키 이름 그대로 보여준다.
 */
const SLOT_LABELS = {
  recipient: '받는 분',
  recipientName: '받는 분',
  recipientId: '받는 분',
  displayName: '받는 분',
  amount: '보내는 금액',
  confirmedAmount: '보내는 금액',
  recognizedAmount: '들은 금액',
  fromAccount: '출금 계좌',
  fromAccountId: '출금 계좌',
  accountNumberMasked: '계좌번호',
  bankCode: '은행',
  bank: '은행',
  relationship: '관계',
}

const AMOUNT_KEYS = ['amount', 'confirmedAmount', 'recognizedAmount']

const CORRECTION_CHOICES = [
  { key: 'recipient', label: '이름 고치기', hint: '받는 분 이름만 말씀해 주세요.' },
  { key: 'amount', label: '금액 고치기', hint: '보내실 금액만 말씀해 주세요.' },
]

const ORDINAL_LABELS = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째']

function formatSlotValue(key, value) {
  if (value === null || value === undefined || value === '') return '아직 없어요'
  if (AMOUNT_KEYS.includes(key)) {
    const amount = Number(value)
    if (Number.isFinite(amount)) return `${amount.toLocaleString('ko-KR')}원`
  }
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function toRows(payload, depth = 0) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []

  return Object.entries(payload).flatMap(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && depth < 1) {
      return toRows(value, depth + 1)
    }
    return [{ key, label: SLOT_LABELS[key] ?? key, value: formatSlotValue(key, value) }]
  })
}

const displayError = computed(() => actionError.value || voiceStore.error?.message || '')

const statusLabel = computed(() => {
  if (voiceStore.listening) return '듣고 있어요'
  if (voiceStore.busy) return '확인하고 있어요'
  if (voiceStore.speaking) return '읽어드리는 중이에요'
  return '마이크를 누르고 말씀해 주세요'
})

/**
 * 세션이 아직 없으면 서버가 확정한 sttMode를 알 수 없다.
 * 송금은 진입점만으로 BACKEND_STREAM이 확정이므로 진입점으로 판단한다.
 */
const voiceCaptureReady = computed(() => {
  if (voiceStore.session) return !voiceStore.usesBackendStream
  return props.entryPoint !== 'TRANSFER'
})
const guidanceText = computed(() => voiceStore.ttsText)
const busy = computed(() => voiceStore.busy || voiceStore.listening)
const canSubmitDraft = computed(() => !busy.value && draft.value.trim().length > 0)
const isCorrectionScreen = computed(() => props.screenKey === 'transfer-misheard')
const draftRows = computed(() => toRows(voiceStore.draftSummary))
const requiredSlotRows = computed(() => toRows(voiceStore.requiredSlot))

const isTransfer = computed(() => props.entryPoint === 'TRANSFER')
const homeRoute = computed(() =>
  isTransfer.value ? { name: 'transfer-home' } : { name: 'voice-home' },
)

const candidateCard = computed(() => voiceStore.selectableCard)
const candidateItems = computed(() => voiceStore.cardItems)
const isAmountCard = computed(() => candidateCard.value?.type === 'AMOUNT_RECONFIRM')
const candidateHeading = computed(() =>
  isAmountCard.value ? '보낼 금액을 골라주세요' : '받는 분을 골라주세요',
)

function candidateLabel(item) {
  if (isAmountCard.value) {
    const amount = Number(item?.amount)
    return item?.label || (Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '금액')
  }

  const parts = [item?.displayName || item?.name, item?.relationship, item?.accountNumberMasked]
  return parts.filter(Boolean).join(' · ') || '받는 분'
}

function ordinalLabel(index) {
  return ORDINAL_LABELS[index] ?? `${index + 1}번째`
}

function clearNoResponseTimer() {
  if (noResponseTimer === null) return
  clearTimeout(noResponseTimer)
  noResponseTimer = null
}

function startNoResponseTimer() {
  clearNoResponseTimer()
  if (!isTransfer.value || ending.value) return
  if (!voiceStore.sessionId || voiceStore.sessionClosed) return

  noResponseTimer = setTimeout(() => {
    noResponseTimer = null
    if (!reannounced) {
      reannounced = true
      replay()
      return
    }
    endByNoResponse()
  }, NO_RESPONSE_MS)
}

/** 종료 안내를 끝까지 들려준 뒤 이동한다. 재생 중에 화면을 옮기면 안내가 잘린다. */
async function waitForGuidanceEnd() {
  await nextTick()
  if (!voiceStore.speaking) return

  await new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      unwatch()
      resolve()
    }
    const timer = setTimeout(finish, END_GUIDANCE_TIMEOUT_MS)
    const unwatch = watch(
      () => voiceStore.speaking,
      (speaking) => {
        if (!speaking) finish()
      },
    )
  })
}

async function leaveAfterGuidance() {
  if (ending.value) return
  ending.value = true
  clearNoResponseTimer()

  await waitForGuidanceEnd()
  await voiceStore.closeSession().catch(() => {})
  voiceStore.reset()
  await router.push(homeRoute.value)
}

async function endByNoResponse() {
  clearNoResponseTimer()

  try {
    await voiceStore.cancelCardFlow()
  } catch {
    // 취소할 카드가 없으면 안내 없이 세션만 정리한다.
    await leaveAfterGuidance()
  }
}

async function ensureSession() {
  if (voiceStore.sessionId) return
  // 음성 토큰은 재생 직전에 스토어가 알아서 받고 갱신한다.
  await voiceStore.startSession(props.entryPoint)
}

async function listen() {
  actionError.value = ''
  try {
    await ensureSession()
    await voiceStore.listenAndSendTurn()
  } catch (error) {
    actionError.value = error?.message || '말씀을 듣지 못했어요. 다시 시도해 주세요.'
    if (['STT_MODE_UNSUPPORTED', 'STT_UNAVAILABLE'].includes(error?.code)) {
      showKeyboard.value = true
    }
  }
}

async function replay() {
  actionError.value = ''
  try {
    await voiceStore.replay()
  } catch (error) {
    actionError.value = error?.message || '다시 들려드리지 못했어요.'
  }
}

async function submitDraft() {
  actionError.value = ''
  try {
    await ensureSession()
    await voiceStore.sendTextTurn(draft.value)
    draft.value = ''
  } catch (error) {
    actionError.value = error?.message || '입력하신 내용을 보내지 못했어요.'
  }
}

function focusCandidate(index) {
  focusedIndex.value = index
}

/** 기본 선택만으로는 확정하지 않는다. 이 단추를 눌러야 서버가 승인한다. */
async function confirmSelection() {
  actionError.value = ''
  const item = candidateItems.value[focusedIndex.value]
  if (!item?.id) {
    actionError.value = '고르신 항목을 찾지 못했어요. 다시 골라주세요.'
    return
  }

  try {
    await voiceStore.acceptCardSelection(item.id)
  } catch (error) {
    actionError.value = error?.message || '선택을 확인하지 못했어요. 다시 해주세요.'
  }
}

async function rejectSelection() {
  actionError.value = ''
  try {
    await voiceStore.rejectCardSelection()
  } catch (error) {
    actionError.value = error?.message || '다시 고를 수 없었어요.'
  }
}

async function cancelFlow() {
  actionError.value = ''
  try {
    await voiceStore.cancelCardFlow()
  } catch (error) {
    actionError.value = error?.message || '취소하지 못했어요.'
  }
}

/** 2-25에서 틀린 항목만 골라 다시 말한다. 채워 넣는 판단은 서버가 한다. */
function chooseCorrection(choice) {
  actionError.value = ''
  correctionHint.value = choice.hint

  if (voiceCaptureReady.value) {
    listen()
    return
  }
  showKeyboard.value = true
}

async function endConversation() {
  actionError.value = ''
  clearNoResponseTimer()
  voiceStore.silence()
  if (!voiceStore.sessionId) return

  try {
    await voiceStore.closeSession()
    // 닫힌 세션을 ensureSession이 재사용하지 않도록 비운다.
    voiceStore.reset()
  } catch (error) {
    // 실패 시에는 세션 ID를 남겨 다시 시도할 수 있게 한다.
    actionError.value = error?.message || '음성 안내를 끄지 못했어요.'
  }
}

watch(
  () => voiceStore.lastTurn,
  () => {
    correctionHint.value = ''
    focusedIndex.value = 0
    reannounced = false
  },
)

watch(
  () => voiceStore.listening,
  (listening) => {
    if (listening) clearNoResponseTimer()
  },
)

watch(
  () => voiceStore.speaking,
  (speaking) => {
    if (speaking) {
      clearNoResponseTimer()
      return
    }
    startNoResponseTimer()
  },
)

watch(
  () => voiceStore.flowCancelled,
  (cancelled) => {
    if (cancelled) leaveAfterGuidance()
  },
)

onBeforeUnmount(() => {
  clearNoResponseTimer()
  voiceStore.silence()
})
</script>

<template>
  <section
    aria-label="음성 대화"
    class="flex flex-col gap-5 rounded-[28px] bg-card p-6"
  >
    <p
      aria-live="polite"
      class="text-[15px] font-semibold text-muted-foreground"
    >
      {{ statusLabel }}
    </p>

    <p
      v-if="guidanceText"
      class="text-2xl leading-relaxed font-bold"
    >
      {{ guidanceText }}
    </p>

    <p
      v-if="correctionHint"
      class="rounded-2xl bg-muted p-4 text-lg leading-relaxed"
      role="status"
    >
      {{ correctionHint }}
    </p>

    <p
      v-if="voiceStore.transcript"
      class="text-lg leading-relaxed"
    >
      이렇게 들었어요 — “{{ voiceStore.transcript }}”
    </p>

    <div
      v-if="candidateCard"
      :aria-label="candidateHeading"
      class="flex flex-col gap-3 rounded-2xl border p-4"
      role="radiogroup"
    >
      <strong class="text-[15px]">{{ candidateHeading }}</strong>

      <button
        v-for="(item, index) in candidateItems"
        :key="item.id"
        :aria-checked="index === focusedIndex"
        class="flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-lg"
        :class="index === focusedIndex ? 'border-primary bg-muted font-bold' : ''"
        :disabled="busy"
        role="radio"
        type="button"
        @click="focusCandidate(index)"
      >
        <span>{{ ordinalLabel(index) }} · {{ candidateLabel(item) }}</span>
        <b
          v-if="index === focusedIndex"
          aria-hidden="true"
        >
          ✓
        </b>
      </button>

      <p class="text-[15px] leading-relaxed text-muted-foreground">
        고르신 것이 맞으면 아래에서 한 번 더 확인해 주세요.
      </p>

      <Button
        class="w-full"
        :disabled="busy"
        @click="confirmSelection"
      >
        이게 맞아요
      </Button>
      <Button
        class="w-full"
        :disabled="busy"
        variant="secondary"
        @click="rejectSelection"
      >
        아니에요, 다시 고를게요
      </Button>
      <Button
        class="w-full"
        :disabled="busy"
        variant="ghost"
        @click="cancelFlow"
      >
        돈 보내기 그만두기
      </Button>
    </div>

    <div
      v-if="requiredSlotRows.length"
      class="flex flex-col gap-2 rounded-2xl bg-muted p-4"
    >
      <strong class="text-[15px]">아직 확인이 필요해요</strong>
      <div
        v-for="row in requiredSlotRows"
        :key="`required-${row.key}`"
        class="flex items-baseline justify-between gap-3 text-lg"
      >
        <span>{{ row.label }}</span>
        <b>{{ row.value }}</b>
      </div>
    </div>

    <div
      v-if="draftRows.length"
      class="flex flex-col gap-2 rounded-2xl border p-4"
      aria-label="보내려는 내용"
    >
      <strong class="text-[15px]">보내려는 내용</strong>
      <div
        v-for="row in draftRows"
        :key="`draft-${row.key}`"
        class="flex items-baseline justify-between gap-3 text-xl"
      >
        <span>{{ row.label }}</span>
        <b>{{ row.value }}</b>
      </div>
    </div>

    <p
      v-if="!voiceCaptureReady"
      class="rounded-2xl bg-muted p-4 text-[15px] leading-relaxed"
      role="status"
    >
      송금 음성 인식은 아직 준비 중이에요. 아래에 직접 입력하시거나 화면 단추로 진행해 주세요.
    </p>

    <p
      v-if="displayError"
      class="text-[15px] leading-relaxed text-destructive"
      role="alert"
    >
      {{ displayError }}
    </p>

    <div
      v-if="isCorrectionScreen"
      class="flex flex-col gap-3"
      role="group"
      aria-label="고칠 곳 고르기"
    >
      <Button
        v-for="choice in CORRECTION_CHOICES"
        :key="choice.key"
        class="w-full"
        :disabled="busy"
        variant="secondary"
        @click="chooseCorrection(choice)"
      >
        {{ choice.label }}
      </Button>
    </div>

    <div class="flex flex-col gap-3">
      <Button
        v-if="voiceCaptureReady"
        class="min-h-16 w-full text-xl"
        :disabled="busy"
        @click="listen"
      >
        {{ voiceStore.listening ? '듣고 있어요…' : '음성으로 말하기' }}
      </Button>

      <Button
        v-if="guidanceText"
        class="w-full"
        :disabled="busy"
        variant="secondary"
        @click="replay"
      >
        다시 듣기
      </Button>

      <Button
        class="w-full"
        variant="secondary"
        @click="showKeyboard = !showKeyboard"
      >
        {{ showKeyboard ? '키보드 닫기' : '키보드로 입력' }}
      </Button>
    </div>

    <div
      v-if="showKeyboard"
      class="flex flex-col gap-3"
    >
      <label
        class="text-[15px] font-semibold"
        for="voice-draft"
      >
        하실 말씀을 적어주세요
      </label>
      <input
        id="voice-draft"
        v-model="draft"
        class="min-h-14 rounded-2xl border px-4 text-lg"
        maxlength="200"
        placeholder="예: 김영희에게 오만원 보내줘"
        type="text"
        @keyup.enter="canSubmitDraft && submitDraft()"
      />
      <Button
        class="w-full"
        :disabled="!canSubmitDraft"
        @click="submitDraft"
      >
        보내기
      </Button>
    </div>

    <Button
      v-if="voiceStore.sessionId"
      class="w-full"
      variant="ghost"
      @click="endConversation"
    >
      음성 안내 끄기
    </Button>
  </section>
</template>
