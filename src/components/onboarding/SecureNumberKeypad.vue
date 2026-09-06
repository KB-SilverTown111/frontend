<script setup>
import { onBeforeUnmount, ref } from 'vue'

import { isAllowedResidentNumberFirstDigit } from '@/features/onboarding/contract.js'
import { createRandomDigitOrder, pickDecoyDigits } from '@/features/onboarding/screens.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['close', 'update:modelValue'])
const digits = createRandomDigitOrder()
const activeDigits = ref(new Set())
let closeTimer
let feedbackTimer

function showPressFeedback(digit) {
  clearTimeout(feedbackTimer)
  activeDigits.value = new Set([digit, ...pickDecoyDigits(digits, digit)])
  feedbackTimer = setTimeout(() => {
    activeDigits.value = new Set()
  }, 140)
}

function enterDigit(digit) {
  if (props.modelValue.length >= 7 || !canEnterDigit(digit)) return

  const value = `${props.modelValue}${digit}`
  emit('update:modelValue', value)
  showPressFeedback(digit)

  if (value.length === 7) {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => emit('close'), 220)
  }
}

function canEnterDigit(digit) {
  return props.modelValue.length > 0 || isAllowedResidentNumberFirstDigit(digit)
}

function removeDigit() {
  clearTimeout(closeTimer)
  activeDigits.value = new Set()
  emit('update:modelValue', props.modelValue.slice(0, -1))
}

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  clearTimeout(feedbackTimer)
})
</script>

<template>
  <div
    class="secure-keypad-backdrop"
    @click.self="$emit('close')"
  >
    <section
      aria-labelledby="secure-keypad-title"
      aria-modal="true"
      class="secure-keypad-sheet"
      role="dialog"
    >
      <header class="secure-keypad-header">
        <div>
          <h2 id="secure-keypad-title">주민등록번호 뒷자리</h2>
          <p
            aria-live="polite"
            role="status"
          >
            {{ modelValue.length }}자리 입력됨
          </p>
        </div>
        <button
          aria-label="숫자 키패드 닫기"
          type="button"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>

      <div class="secure-keypad-grid">
        <button
          v-for="digit in digits"
          :key="digit"
          :aria-label="`숫자 ${digit}`"
          class="secure-keypad-key"
          :class="{ active: activeDigits.has(digit) }"
          :disabled="!canEnterDigit(digit)"
          type="button"
          @click="enterDigit(digit)"
        >
          {{ digit }}
        </button>
        <span aria-hidden="true" />
        <button
          aria-label="마지막 숫자 지우기"
          class="secure-keypad-key secure-keypad-delete"
          type="button"
          @click="removeDigit"
        >
          지우기
        </button>
      </div>
    </section>
  </div>
</template>
