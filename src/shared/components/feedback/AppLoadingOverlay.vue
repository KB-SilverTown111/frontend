<script setup>
import { isAppLoading } from '@/shared/services/appLoading.js'
</script>

<template>
  <Transition name="app-loading">
    <div
      v-if="isAppLoading"
      aria-busy="true"
      aria-live="polite"
      class="app-loading-overlay"
      role="status"
    >
      <div class="app-loading-card">
        <span
          aria-hidden="true"
          class="app-loading-spinner"
        />
        <strong>화면을 불러오는 중이에요.</strong>
        <p>잠시만 기다려 주세요.</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-loading-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(255 245 208 / 92%);
  backdrop-filter: blur(2px);
}

.app-loading-card {
  width: min(100%, 320px);
  padding: 32px 24px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  box-shadow: 0 14px 30px rgb(23 63 82 / 14%);
  color: var(--foreground);
  text-align: center;
}

.app-loading-spinner {
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 6px solid var(--muted);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: app-loading-spin 0.9s linear infinite;
}

.app-loading-card strong {
  display: block;
  font-size: var(--font-size-action);
  font-weight: 800;
}

.app-loading-card p {
  margin: 10px 0 0;
  color: var(--muted-foreground);
  font-size: var(--font-size-body);
}

.app-loading-enter-active,
.app-loading-leave-active {
  transition: opacity 0.15s ease;
}

.app-loading-enter-from,
.app-loading-leave-to {
  opacity: 0;
}

@keyframes app-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-loading-spinner {
    animation: none;
  }
}
</style>
