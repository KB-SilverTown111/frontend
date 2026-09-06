<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'

const router = useRouter()
const helpStatus = ref('')

function requestHelp(mode) {
  window.dispatchEvent(new CustomEvent(`gwipyeonhan:help-${mode}`))
  helpStatus.value =
    mode === 'voice'
      ? '음성 도움 기능을 시작할 준비가 됐어요.'
      : '글자 질문 화면을 여는 이벤트를 보냈어요.'
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell">
      <header class="app-header">
        <Button
          aria-label="도움말 닫기"
          class="app-header-button"
          size="icon"
          variant="secondary"
          @click="router.back()"
        >
          ×
        </Button>
        <strong class="app-brand">귀편한 금융</strong>
        <span class="app-header-spacer" />
      </header>

      <main class="app-main help-main">
        <section class="screen-heading">
          <h1>무엇을 도와드릴까요?</h1>
          <p>궁금한 내용을 말하면 쉽게 안내해 드려요.</p>
        </section>

        <section class="voice-help-card">
          <button
            aria-label="음성 질문 시작"
            class="voice-help-mic"
            type="button"
            @click="requestHelp('voice')"
          >
            ●
          </button>
          <strong>마이크를 눌러 말씀하세요</strong>
          <p>버튼을 누르기 전에는 음성을 듣지 않아요.</p>
        </section>

        <section class="example-card">
          <b>이렇게 물어보세요</b>
          <p>“가입은 어떻게 하나요?”</p>
          <p>“이 화면에서 뭘 눌러야 하나요?”</p>
        </section>
        <p class="help-caption">음성이 어려우면 글자로도 질문할 수 있어요.</p>
        <p
          v-if="helpStatus"
          class="guide-card action-notice"
          role="status"
        >
          {{ helpStatus }}
        </p>
      </main>

      <footer class="app-actions">
        <Button
          class="w-full"
          @click="requestHelp('voice')"
          >음성으로 도움받기</Button
        >
        <Button
          class="w-full"
          variant="secondary"
          @click="requestHelp('text')"
          >글자로 질문하기</Button
        >
      </footer>
    </article>
  </div>
</template>
