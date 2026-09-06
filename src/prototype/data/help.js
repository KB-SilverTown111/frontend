export default {
  id: 'help',
  number: '도움말',
  title: '무엇을 도와드릴까요?',
  description: '궁금한 내용을 말하면 쉽게 안내해 드려요.',
  contentHtml: `<section class="voice-card">
    <span class="glow g1"></span><span class="glow g2"></span>
    <button class="mic-button" type="button" aria-label="음성 도움 시작">
      <span class="mic-body"></span><span class="mic-stem"></span>
    </button>
    <strong>마이크를 눌러 말씀하세요</strong>
    <p>버튼을 누르기 전에는 음성을 듣지 않아요.</p>
  </section>
  <section class="examples">
    <strong>이렇게 물어보세요</strong>
    <p>“가입은 어떻게 하나요?”</p>
    <p>“이 화면에서 뭘 눌러야 하나요?”</p>
  </section>
  <p class="privacy">음성이 어려우면 글자로도 질문할 수 있어요.</p>`,
  primaryLabel: '음성으로 도움받기',
  secondaryLabel: '글자로 질문하기',
  variant: 'default',
  showHelp: false,
  showTabs: false,
}
