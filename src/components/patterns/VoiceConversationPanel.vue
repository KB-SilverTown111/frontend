<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { useVoiceStore } from '@/stores/voice.js'

const props = defineProps({
  entryPoint: {
    type: String,
    default: 'GENERAL_FINANCE',
  },
  screenId: {
    type: String,
    default: '',
  },
})

const voiceStore = useVoiceStore()

const actionError = ref('')
const showKeyboard = ref(false)
const draft = ref('')
const correctionHint = ref('')

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
const isCorrectionScreen = computed(() => props.screenId === '2-25')
const draftRows = computed(() => toRows(voiceStore.draftSummary))
const requiredSlotRows = computed(() => toRows(voiceStore.requiredSlot))

async function ensureSession() {
  if (voiceStore.sessionId) return
  await voiceStore.startSession(props.entryPoint)
  await voiceStore.issueSpeechToken().catch(() => {})
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
  voiceStore.silence()
  if (voiceStore.sessionId) await voiceStore.closeSession().catch(() => {})
}

watch(
  () => voiceStore.lastTurn,
  () => {
    correctionHint.value = ''
  },
)

onBeforeUnmount(() => {
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
