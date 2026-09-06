<script setup>
import { stripGuidanceCards } from '@/prototype/stripGuidanceCards.js'

defineProps({
  screen: { type: Object, required: true },
})
</script>

<template>
  <section
    class="prototype-screen-content"
    :data-variant="screen.variant"
  >
    <h1>{{ screen.title }}</h1>
    <p class="sub">{{ screen.description }}</p>
    <!-- Content is generated from the bundled, reviewed prototype manifest. -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="content"
      v-html="stripGuidanceCards(screen.contentHtml)"
    />
    <!-- eslint-enable vue/no-v-html -->
    <p
      v-if="screen.variant === 'warning'"
      class="sr-only"
      role="status"
    >
      확인이 필요한 화면입니다.
    </p>
    <p
      v-if="screen.variant === 'destructive'"
      class="sr-only"
      role="alert"
    >
      오류 또는 주의가 필요한 화면입니다.
    </p>
  </section>
</template>
