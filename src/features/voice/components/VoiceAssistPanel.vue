<script setup>
import { computed, ref } from 'vue'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const props = defineProps({ class: { type: [String, Array, Object], default: undefined } })
const listening = ref(false)
const status = computed(() =>
  listening.value ? '듣고 있어요. 편하게 말씀해 주세요.' : '버튼을 눌러 음성 도움을 시작하세요.',
)
</script>

<template>
  <section
    :class="
      cn(
        'flex flex-col items-center gap-6 rounded-[28px] bg-gradient-to-br from-[#add1b8] to-primary p-8 text-center sm:flex-row sm:text-left',
        props.class,
      )
    "
    aria-labelledby="voice-assist-title"
  >
    <Button
      aria-label="음성 도움 시작"
      class="size-28 shrink-0 rounded-full bg-card text-4xl text-foreground shadow-xl hover:bg-card/90"
      size="icon"
      @click="listening = !listening"
    >
      {{ listening ? '■' : '●' }}
    </Button>
    <div>
      <h3
        id="voice-assist-title"
        class="text-2xl font-bold"
      >
        궁금한 내용을 말씀해 주세요
      </h3>
      <p class="mt-2 text-[length:var(--font-size-body)] leading-relaxed text-[#315a49]">
        {{ status }}
      </p>
      <div
        v-if="listening"
        class="mt-5 flex h-11 items-center justify-center gap-1 sm:justify-start"
        aria-hidden="true"
      >
        <i
          v-for="height in [14, 30, 44, 24, 38, 18, 31]"
          :key="height"
          class="w-1 rounded-full bg-white"
          :style="{ height: `${height}px` }"
        />
      </div>
      <p class="mt-4 text-base font-semibold text-[#315a49]">
        버튼을 누르기 전에는 음성을 듣지 않아요.
      </p>
    </div>
  </section>
</template>
