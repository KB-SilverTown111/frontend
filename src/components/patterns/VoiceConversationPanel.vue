<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { useVoiceStore } from '@/stores/voice.js'

const props = defineProps({
  entryPoint: {
    type: String,
    default: 'GENERAL_FINANCE',
  },
})

const voiceStore = useVoiceStore()

const actionError = ref('')
const showKeyboard = ref(false)
const draft = ref('')

const statusLabel = computed(() => {
  if (voiceStore.listening) return '듣고 있어요'
  if (voiceStore.busy) return '확인하고 있어요'
  if (voiceStore.speaking) return '읽어드리는 중이에요'
  return '마이크를 누르고 말씀해 주세요'
})

const voiceCaptureReady = computed(() => !voiceStore.usesBackendStream)
const guidanceText = computed(() => voiceStore.ttsText)
const busy = computed(() => voiceStore.busy || voiceStore.listening)
const canSubmitDraft = computed(() => !busy.value && draft.value.trim().length > 0)

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

async function endConversation() {
  actionError.value = ''
  voiceStore.silence()
  if (voiceStore.sessionId) await voiceStore.closeSession().catch(() => {})
}

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
      v-if="voiceStore.transcript"
      class="text-lg leading-relaxed"
    >
      이렇게 들었어요 — “{{ voiceStore.transcript }}”
    </p>

    <p
      v-if="!voiceCaptureReady"
      class="rounded-2xl bg-muted p-4 text-[15px] leading-relaxed"
      role="status"
    >
      송금 음성 인식은 아직 준비 중이에요. 아래에 직접 입력하시거나 화면 단추로 진행해 주세요.
    </p>

    <p
      v-if="actionError"
      class="text-[15px] leading-relaxed text-destructive"
      role="alert"
    >
      {{ actionError }}
    </p>

    <div class="flex flex-col gap-3">
      <Button
        v-if="voiceCaptureReady"
        class="w-full min-h-16 text-xl"
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
